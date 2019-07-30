const { describe, it } = require("mocha");
const { expect } = require("chai");

const { authenticate } = require("../src/auth");

describe("auth", () => {
  it("should return 200 OK", async () => {
    const users = { "dXNlcjpwYXNzd29yZA==": "user" };
    const container = { users: { user: "ro" } };

    const req = {
      headers: { authorization: "Basic dXNlcjpwYXNzd29yZA==" },
      method: "GET"
    };

    const result = authenticate(req, users, container);
    expect(result).to.equal(200);
  });

  it("should return 200 OK for anonymous users", async () => {
    const users = {};
    const container = { users: { anonymous: "ro" } };

    const req = { headers: {}, method: "GET" };

    const result = authenticate(req, users, container);
    expect(result).to.equal(200);
  });

  it("should return 200 OK for authenticated users", async () => {
    const users = { "dXNlcjpwYXNzd29yZA==": "user" };
    const container = { users: { authenticated: "ro" } };

    const req = {
      headers: { authorization: "Basic dXNlcjpwYXNzd29yZA==" },
      method: "GET"
    };

    const result = authenticate(req, users, container);
    expect(result).to.equal(200);
  });

  it("should return 401 authentication failure", async () => {
    const container = { users: { user: "ro" } };

    const req = { headers: { authorization: "Basic abc" } };

    const result = authenticate(req, {}, container);
    expect(result).to.equal(401);
  });

  it("should return 403 authorization failure", async () => {
    const users = { "dXNlcjpwYXNzd29yZA==": "user" };
    const container = { users: { user: "ro" } };

    const req = {
      headers: { authorization: "Basic dXNlcjpwYXNzd29yZA==" },
      method: "POST"
    };

    const result = authenticate(req, users, container);
    expect(result).to.equal(403);
  });
});
