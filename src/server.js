const { join, basename, dirname } = require("path");
const { env } = require("process");

const express = require("express");
const {
  exists,
  stat,
  mkdirs,
  readdir,
  createWriteStream,
  unlink,
  move
} = require("fs-extra");

const { authenticate, authorize } = require("./auth");

const log = env.NODE_TEST ? () => {} : (...args) => console.log(...args);

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
  if (!acceptFile(path)) {
    res.status(405).send(`Invalid file path: ${path}`);
  } else if (container.type === "group") {
    res.status(405).send("PUT not supported for groups!");
  } else {
    const file = join(container.path, path);
    if (!matchPrefix(container, file)) {
      res.status(405).send(`File does not match any prefix: ${path}`);
    } else if (allowReplace(file)) {
      writeReceivedFile(req, res, file).then(
        () => res.sendStatus(200),
        err => sendError(res, err)
      );
    } else {
      exists(file).then(
        fileExists => {
          if (fileExists) {
            res.status(400).send("Cannot overwrite release artifacts!");
          } else {
            writeReceivedFile(req, res, file).then(
              () => res.sendStatus(200),
              err => sendError(res, err)
            );
          }
        },
        err => sendError(res, err)
      );
    }
  }
}

function acceptFile(path) {
  const filename = basename(path);
  return (
    !filename.startsWith(".") &&
    !filename.startsWith(" ") &&
    !filename.endsWith(" ")
  );
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

function matchPrefix(repository, file) {
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

async function writeReceivedFile(req, res, file) {
  const parent = dirname(file);
  await mkdirs(parent);

  const tmpfile = join(parent, `.${basename(file)}.tmp`);
  try {
    const tmpstream = createWriteStream(tmpfile);
    try {
      await new Promise((resolve, reject) => {
        req
          .pipe(tmpstream)
          .on("error", err => reject(err))
          .on("finish", () => resolve());
      });
    } catch (e) {
      tmpstream.close();
      throw e;
    }
    await move(tmpfile, file, { overwrite: true });
  } catch (e) {
    await unlink(tmpfile);
    throw e;
  }

  log("File written:", file);
}

function sendError(res, err) {
  if (!res.headersSent) {
    if (err && err.code === "ENOENT") {
      res.sendStatus(404);
    } else {
      log("Error!", err);
      res.sendStatus(500);
    }
  }
}

module.exports = { createServer };
