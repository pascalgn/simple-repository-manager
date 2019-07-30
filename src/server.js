const { dirname } = require("path");

const express = require("express");
const { exists, stat, mkdirs, readdir, writeFile } = require("fs-extra");

const { authenticate } = require("./auth");
const { getContainer, getRepository, getFile } = require("./router");

function createServer(debug, containers, users) {
  const app = express();

  if (debug) {
    app.use((req, res, next) => {
      const { method, url } = req;
      console.log(`${method} ${url}`);
      next();
    });
  }

  app.use((req, res, next) => {
    const container = getContainer(containers, req);
    if (container == null) {
      res.status(404).send("Repository or group not found.");
    } else {
      res.locals.container = container;
      next();
    }
  });

  app.use((req, res, next) => {
    const { container } = res.locals;
    const status = authenticate(req, users, container);
    if (status === 200) {
      next();
    } else if (status === 401) {
      res.header("WWW-Authenticate", "Basic").sendStatus(401);
    } else if (status === 403) {
      res.sendStatus(403);
    } else {
      res.sendStatus(500);
    }
  });

  app.use((req, res) => {
    const { container } = res.locals;

    const repository = getRepository(container, req);
    if (repository == null) {
      return res.sendStatus(404);
    }

    const file = getFile(repository, req);
    if (file == null) {
      return res.sendStatus(400);
    }

    const { method } = req;
    if (method === "HEAD") {
      handleHead(req, res, file);
    } else if (method === "GET") {
      handleGet(req, res, file);
    } else if (method === "PUT") {
      handlePut(req, res, file);
    } else {
      res.sendStatus(405);
    }
  });

  return app;
}

function handleHead(req, res, file) {
  stat(file).then(() => res.sendStatus(200), err => sendError(res, err));
}

function handleGet(req, res, file) {
  if (req.url === "/") {
    readdir(file).then(files => res.json(files), err => sendError(res, err));
  } else {
    res.sendFile(file, err => sendError(res, err));
  }
}

function handlePut(req, res, file) {
  if (allowReplace(file)) {
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
        .on("end", async () => {
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
