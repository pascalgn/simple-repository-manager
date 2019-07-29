function authenticate(req, users, container) {
  if (Object.keys(container.users).length === 0) {
    return 200;
  }

  const { headers, method } = req;

  const header = headers["authorization"];
  if (!header || !header.startsWith("Basic ")) {
    return 401;
  }

  const user = header.substr(6);
  const username = users[user];
  if (!username) {
    return 401;
  }

  const permissions = container.users[username];

  if (permissions === "ro") {
    if (method === "HEAD" || method === "GET") {
      return 200;
    } else {
      return 403;
    }
  } else if (permissions === "rw") {
    return 200;
  } else {
    return 401;
  }
}

module.exports = { authenticate };
