const { join, dirname } = require("path");

const express = require("express");
const { exists, stat, mkdirs, readdir, writeFile } = require("fs-extra");

const { authenticate, authorize } = require("./auth");

function createServer(debug, config) {
  const app = express();

  if (debug) {
    app.use((req, res, next) => {
      const { method, url } = req;
      console.log(`${method} ${url}`);
      next();
    });
  }

  app.use((req, res) => {
    const username = authenticate(req, config);
    if (!username) {
      return res.header("WWW-Authenticate", "Basic").sendStatus(401);
    }

    if (req.url === "/") {
      return res.sendStatus(200);
    }

    const idx = req.path.indexOf("/", 1);
    const name = idx === -1 ? req.path : req.path.substr(1, idx - 1);
    const path = idx === -1 ? "" : req.path.substr(idx);

    const container = config.containers.find(
      container => container.name === name
    );

    if (container == null) {
      return res.status(404).send(`Group or repository not found: ${name}`);
    }

    if (!authorize(req, username, container)) {
      return res.sendStatus(403);
    }

    const { method } = req;
    if (method === "HEAD") {
      handleHead(req, res, container, path);
    } else if (method === "GET") {
      handleGet(req, res, container, path);
    } else if (method === "PUT") {
      handlePut(req, res, container, path);
    } else {
      res.sendStatus(405);
    }
  });

  return app;
}

function handleHead(req, res, container, path) {
  findFile(container, path).then(
    ([stats]) =>
      res
        .header("Content-Length", stats.size)
        .status(200)
        .send(),
    err => sendError(res, err)
  );
}

function handleGet(req, res, container, path) {
  findFile(container, path).then(
    ([stats, file]) =>
      stats.isDirectory()
        ? readdir(file).then(
            files => res.json(files),
            err => sendError(res, err)
          )
        : res.sendFile(file, err => sendError(res, err)),
    err => sendError(res, err)
  );
}

function handlePut(req, res, container, path) {
  if (container.type === "group") {
    res.status(405).send("PUT not supported for groups!");
  } else {
    const file = join(container.path, path);
    if (!acceptFile(container, file)) {
      res.status(405).send(`File does not match any prefix: ${path}`);
    } else if (allowReplace(file)) {
      writeReceivedFile(req, res, file);
    } else {
      exists(file).then(
        fileExists => {
          if (fileExists) {
            res.status(400).send("Cannot overwrite release artifacts!");
          } else {
            writeReceivedFile(req, res, file);
          }
        },
        err => sendError(res, err)
      );
    }
  }
}

async function findFile(container, path) {
  if (container.type === "repository") {
    const file = join(container.path, path);
    const stats = await stat(file);
    return [stats, file];
  } else {
    for (let i = 0; i < container.repositories.length; i++) {
      const repository = container.repositories[i];
      const file = join(repository.path, path);
      try {
        const stats = await stat(file);
        return [stats, file];
      } catch (e) {
        if (i + 1 < container.repositories.length) {
          continue;
        } else {
          throw e;
        }
      }
    }
    throw new Error("Unexpected error.");
  }
}

function acceptFile(repository, file) {
  return repository.prefixes.find(prefix => file.startsWith(prefix)) != null;
}

function allowReplace(file) {
  return (
    file.endsWith("/maven-metadata.xml") ||
    file.endsWith("/maven-metadata.xml.sha1") ||
    file.endsWith("/maven-metadata.xml.md5") ||
    file.includes("-SNAPSHOT/")
  );
}

function writeReceivedFile(req, res, file) {
  const parent = dirname(file);
  mkdirs(parent).then(
    () => {
      const parts = [];
      req
        .on("data", data => parts.push(data))
        .on("error", err => sendError(res, err))
        .on("end", () => {
          const body = Buffer.concat(parts);
          writeFile(file, body).then(
            () => res.sendStatus(200),
            err => sendError(res, err)
          );
        });
    },
    err => sendError(res, err)
  );
}

function sendError(res, err) {
  if (!res.headersSent) {
    if (err && err.code === "ENOENT") {
      res.sendStatus(404);
    } else {
      res.sendStatus(500);
    }
  }
}

module.exports = { createServer };
