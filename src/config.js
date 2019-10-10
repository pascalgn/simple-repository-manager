const { join, resolve } = require("path");

const { exists, readJson, readFile } = require("fs-extra");
const { safeLoad } = require("js-yaml");
const Ajv = require("ajv");

const schemaPath = join(__dirname, "../config-schema.json");

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

  const schema = await readJson(schemaPath);
  const ajv = new Ajv({ useDefaults: true });
  ajv.validate(schema, config);

  if (ajv.errors && ajv.errors.length) {
    throw new Error(
      ajv.errors
        .map(({ dataPath, message }) => `${dataPath || "unknown"}: ${message}`)
        .join("; ")
    );
  }

  const containers = [];

  for (const repository of config.repositories) {
    containers.push(parseRepository(repository));
  }

  for (const group of config.groups) {
    containers.push(parseGroup(containers, group));
  }

  checkUnique(containers);

  for (const container of containers) {
    const { type, path, users } = container;
    if (type === "repository" && !(await exists(path))) {
      throw new Error(`Repository path does not exist: ${path}`);
    }

    for (const user of users) {
      const { name } = user;
      if (name && !config.users.find(user => user.name === name)) {
        throw new Error(`User not in user list: ${name}`);
      }
    }
  }

  config.containers = containers;

  checkUnique(config.users);

  for (const user of config.users) {
    const { name, password } = user;
    user.base64 = Buffer.from(`${name}:${password}`).toString("base64");
  }

  return config;
}

function parseRepository(repository) {
  const { name, users } = repository;
  const path = resolve(repository.path);
  const prefixes =
    repository.prefixes.length === 0
      ? [path + "/"]
      : repository.prefixes
          .map(prefix => prefix.replace(/\./g, "/"))
          .map(p => resolve(path, p) + "/");
  return { name, type: "repository", path, prefixes, users };
}

function parseGroup(containers, group) {
  const { name, users } = group;
  const repositories = containers.filter(
    container =>
      container.type === "repository" &&
      (group.repositories === "all" ||
        group.repositories.includes(container.name))
  );
  if (
    Array.isArray(group.repositories) &&
    group.repositories.length !== repositories.length
  ) {
    throw new Error(`Invalid repository referenced: ${name}`);
  }
  return { name, type: "group", repositories, users };
}

function checkUnique(arr) {
  const names = [];
  for (const obj of arr) {
    const { name } = obj;
    if (names.includes(name)) {
      throw new Error(`Duplicate name: ${name}`);
    } else {
      names.push(name);
    }
  }
}

module.exports = { readConfig, parseConfig };
