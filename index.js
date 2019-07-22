#!/usr/bin/env node

const process = require("process");
const { dirname, resolve } = require("path");

const { exists, stat, mkdirs, writeFile } = require("fs-extra");
const express = require("express");

function main() {
  const debug = process.env.NODE_ENV === "dev";
  const port = process.env.PORT || 3000;
  const root = resolve(process.env.REPOSITORY || "./repository") + "/";

  const app = express();

  app.use((req, res) => {
    const { url, method } = req;

    if (debug) {
      console.log(`${method} ${url}`);
    }

    const file = resolve(root, url.substr(1));
    if (!file.startsWith(root)) {
      res.sendStatus(400);
      return;
    }

    if (method === "HEAD") {
      handleHead(res, file);
    } else if (method === "GET") {
      handleGet(res, file);
    } else if (method === "PUT") {
      handlePut(req, res, file);
    } else {
      res.sendStatus(405);
    }
  });

  app.listen(port, () => console.log(`Server is listening on port ${port}`));
}

function handleHead(res, file) {
  stat(file).then(() => res.sendStatus(200), err => sendError(res, err));
}

function handleGet(res, file) {
  res.sendFile(file, err => sendError(res, err));
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

main();
