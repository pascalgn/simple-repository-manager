function authenticate(req, config) {
  const { headers } = req;
  const header = headers && headers["authorization"];
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  const base64 = header.substr(6);
  for (const user of config.users) {
    if (user.base64 && user.base64 === base64) {
      return user.name;
    }
  }

  return null;
}

function authorize(req, username, container) {
  let permissions = null;
  for (const user of container.users) {
    if (user.name === username) {
      permissions = user.permissions;
      break;
    }
  }

  if (permissions == null) {
    for (const user of container.users) {
      if (user.type === "authenticated") {
        permissions = user.permissions;
        break;
      }
    }
  }

  if (permissions === "ro") {
    const { method } = req;
    return method === "HEAD" || method === "GET";
  } else if (permissions === "rw") {
    return true;
  } else {
    return false;
  }
}

module.exports = { authenticate, authorize };
