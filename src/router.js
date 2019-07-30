const { join } = require("path");

function getContainer(containers, req) {
  const idx = req.path.indexOf("/", 1);
  if (idx === -1) {
    return null;
  }

  // /test/example/123 -> test
  const name = req.path.substr(1, idx - 1);

  return containers[name];
}

function getRepository(container, req) {
  const idx = req.path.indexOf("/", 1);
  if (idx === -1) {
    return null;
  }

  // /test/example/123 -> /example/123/
  const path = req.path.substr(idx) + "/";

  const { paths } = container;

  if (container.type === "group") {
    for (const [p, repository] of paths) {
      if (path.startsWith(p)) {
        return repository;
      }
    }
    return null;
  } else {
    for (const p of paths) {
      if (path.startsWith(p)) {
        return container;
      }
    }
    return null;
  }
}

function getFile(repository, req) {
  const idx = req.path.indexOf("/", 1);
  if (idx === -1) {
    return null;
  }

  // /test/example/123 -> /example/123
  const path = req.path.substr(idx);

  const file = join(repository.path, path);
  return file.startsWith(repository.path + "/") || file === repository.path
    ? file
    : null;
}

module.exports = { getContainer, getRepository, getFile };
