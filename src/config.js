const { join, resolve } = require("path");

const { exists, readJson, readFile } = require("fs-extra");
const { safeLoad } = require("js-yaml");
const Ajv = require("ajv");

const schemaPath = join(__dirname, "../config-schema.json");

const reserved = ["anonymous", "authenticated"];

async function readConfig(...files) {
  return Promise.all(files.map(file => readYaml(file))).then(configs =>
    parseConfig(...configs)
  );
}

async function readYaml(file) {
  const content = await readFile(file, "utf8");
  return safeLoad(content);
}

async function parseConfig(...configs) {
  const config = configs.reduce((prev, cur) => ({ ...prev, ...cur }), {});

  await validateConfig(config);

  const users = parseUsers(config);
  const usernames = Object.values(users);

  const containers = await parseContainers(config, usernames);

  return { port: config.port, containers, users };
}

async function validateConfig(config) {
  const schema = await readJson(schemaPath);
  const ajv = new Ajv({ useDefaults: true });
  if (ajv.validate(schema, config)) {
    return true;
  } else if (ajv.errors.length) {
    throw new Error(
      ajv.errors
        .map(({ dataPath, message }) => `${dataPath || "unknown"}: ${message}`)
        .join("; ")
    );
  } else {
    throw new Error("Invalid configuration!");
  }
}

async function parseContainers(config, usernames) {
  const repositories = {};
  for (const repository of config.repositories) {
    const { name } = repository;
    if (repositories[name]) {
      throw new Error(`Duplicate name entry: ${name}`);
    }

    const paths = [];
    if (Array.isArray(repository.prefixes)) {
      for (const prefix of repository.prefixes) {
        const path = "/" + prefix.replace(/\./g, "/") + "/";
        if (!paths.includes(path)) {
          paths.push(path);
        }
      }
    } else {
      paths.push("/");
    }

    const path = resolve(repository.path);
    if (!(await exists(path))) {
      throw new Error(`Repository path does not exist: ${path}`);
    }

    const users = mapUsers(repository, usernames);

    repositories[name] = { ...repository, path, paths, users };
  }

  const groups = {};
  for (const group of config.groups) {
    const { name } = group;
    if (repositories[name] || groups[name]) {
      throw new Error(`Duplicate name entry: ${name}`);
    }

    const names = Array.isArray(group.repositories)
      ? group.repositories
      : config.repositories.map(repository => repository.name);

    const paths = [];

    let fallback = null;
    for (const name of names) {
      const repository = repositories[name];
      if (!repository) {
        throw new Error(`Unknown repository referenced in group: ${name}`);
      }

      for (const path of repository.paths) {
        if (path === "/") {
          if (fallback == null) {
            fallback = repository;
          } else {
            throw new Error("More than one repository with prefix 'any'!");
          }
        } else {
          for (const [existing] of paths) {
            if (
              path === existing ||
              path.startsWith(existing) ||
              existing.startsWith(path)
            ) {
              throw new Error(`Overlapping prefixes: ${existing} and ${path}`);
            }
          }
          paths.push([path, repository]);
        }
      }
    }

    if (fallback) {
      paths.push(["/", fallback]);
    }

    const users = mapUsers(group, usernames);

    groups[name] = { ...group, type: "group", paths, users };
  }

  return { ...repositories, ...groups };
}

function mapUsers(obj, usernames) {
  const users = {};
  if (Array.isArray(obj.users)) {
    for (const user of obj.users) {
      const { type, name, permissions } = user;
      if (type === "anonymous" || type === "authenticated") {
        users[type] = permissions;
      } else {
        checkReserved(name);
        if (!usernames.includes(name)) {
          throw new Error(`Unknown user referenced: ${name}`);
        }
        users[name] = permissions;
      }
    }
  }
  return users;
}

function parseUsers(users) {
  const result = {};
  if (Array.isArray(users.users)) {
    const names = [];
    for (const user of users.users) {
      const { name, password } = user;
      checkReserved(name);
      if (names.includes(name)) {
        throw new Error(`Duplicate name: ${name}`);
      } else {
        names.push(name);
      }
      const base64 = Buffer.from(`${name}:${password}`).toString("base64");
      result[base64] = name;
    }
  }
  return result;
}

function checkReserved(name) {
  if (reserved.includes(name)) {
    throw new Error(`Cannot use reserved name: ${name}`);
  }
}

module.exports = { readConfig, parseConfig };
