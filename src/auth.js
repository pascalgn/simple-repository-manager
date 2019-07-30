function authenticate(req, users, container) {
  if (Object.keys(container.users).length === 0) {
    return 401;
  }

  const { headers, method } = req;

  const username = getUsername(headers, users);
  let permissions = username
    ? container.users[username] || container.users["authenticated"]
    : container.users["anonymous"];

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

function getUsername(headers, users) {
  const header = headers && headers["authorization"];
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  const base64 = header.substr(6);
  const username = users[base64];
  const ownProperty = Object.prototype.hasOwnProperty.call(users, base64);

  if (username && ownProperty) {
    return username;
  } else {
    return null;
  }
}

module.exports = { authenticate };
