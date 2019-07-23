#!/usr/bin/env node

const process = require("process");
const { dirname, resolve } = require("path");

const { exists, stat, mkdirs, readdir, writeFile } = require("fs-extra");
const express = require("express");

function main() {
  const debug = process.env.NODE_ENV === "dev";
  const port = process.env.PORT || 3000;
  const root = resolve(process.env.REPOSITORY || "./repository") + "/";
  const users = parseAuth(process.env.AUTH || "");

  const app = express();

  if (Object.keys(users).length > 0) {
    app.use((req, res, next) => authenticate(req, res, next, users));
  }

  app.use((req, res) => {
    const { url, method } = req;

    if (debug) {
      console.log(`${method} ${url}`);
    }

    const file = resolve(root, url.substr(1));
    if (!file.startsWith(root) && file + "/" !== root) {
      res.sendStatus(400);
      return;
    }

    if (method === "HEAD") {
      handleHead(res, file);
    } else if (method === "GET") {
      handleGet(req, res, file);
    } else if (method === "PUT") {
      handlePut(req, res, file);
    } else {
      res.sendStatus(405);
    }
  });

  app.listen(port, () => console.log(`Server is listening on port ${port}`));
}

function parseAuth(str) {
  const users = {};
  str
    .split(/(?:\r\n|\r|\n)/g)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .forEach(line => {
      const pos1 = line.indexOf(":");
      if (pos1 > 0) {
        const pos2 = line.indexOf(":", pos1 + 1);
        if (pos2 > 0) {
          const user = Buffer.from(line.substr(0, pos2)).toString("base64");
          const permissions = line.substr(pos2 + 1);
          if (permissions === "ro") {
            users[user] = "ro";
          } else if (permissions === "rw") {
            users[user] = "rw";
          } else {
            throw new Error("Invalid permissions!");
          }
        } else {
          const user = Buffer.from(line).toString("base64");
          users[user] = "rw";
        }
      } else {
        throw new Error("Invalid line!");
      }
    });
  return users;
}

function authenticate(req, res, next, users) {
  const { headers, method } = req;

  const header = headers["authorization"];
  if (!header || !header.startsWith("Basic ")) {
    res.header("WWW-Authenticate", "Basic").sendStatus(401);
    return;
  }

  const user = header.substr(6);
  const permissions = users[user];
  if (permissions === "ro") {
    if (method === "HEAD" || method === "GET") {
      next();
    } else {
      res.sendStatus(403);
    }
  } else if (permissions === "rw") {
    next();
  } else {
    res.header("WWW-Authenticate", "Basic").sendStatus(401);
  }
}

function handleHead(res, file) {
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

main();
