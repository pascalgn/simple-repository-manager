const { dir } = require("tmp-promise");
const { remove } = require("fs-extra");
const { describe, it, beforeEach, afterEach } = require("mocha");
const chai = require("chai");
const chaiHttp = require("chai-http");

const { parseConfig } = require("../src/config");
const { createServer } = require("../src/server");

chai.use(chaiHttp);
const { expect } = chai;

let tmpdir = null;

const config = {
  repositories: [
    {
      name: "repo",
      path: "/tmp",
      prefixes: "all"
    }
  ],
  groups: [
    {
      name: "all",
      repositories: "all",
      users: [{ type: "anonymous", permissions: "rw" }]
    },
    {
      name: "private",
      repositories: "all",
      users: [{ name: "user1", permissions: "rw" }]
    }
  ],
  users: [
    {
      name: "user1",
      password: "password-password-password"
    }
  ]
};

describe("server", () => {
  beforeEach(async () => {
    const { path } = await dir();
    tmpdir = path;

    for (const repository of config.repositories) {
      repository.path = tmpdir;
    }
  });

  afterEach(async () => {
    if (tmpdir) {
      await remove(tmpdir);
    }
  });

  it("should successfully push data to the server", async () => {
    const { containers, users } = await parseConfig(config);

    const app = createServer(false, containers, users);

    return chai
      .request(app)
      .put("/all/com/example/test.txt")
      .then(res => expect(res).to.have.status(200));
  });

  it("should read data from the server", async () => {
    const { containers, users } = await parseConfig(config);

    const app = createServer(false, containers, users);

    const agent = chai.request(app).keepOpen();
    try {
      await agent.put("/all/com/example/test.txt").send("Test 123");

      const result = await agent.get("/all/com/example/test.txt");
      expect(result).to.have.property("text", "Test 123");
    } finally {
      await agent.close();
    }
  });

  it("should return 401 when wrong authentication given", async () => {
    const { containers, users } = await parseConfig(config);

    const app = createServer(false, containers, users);

    return chai
      .request(app)
      .get("/private/com/example/test.txt")
      .auth("user1", "incorrect")
      .then(res => expect(res).to.have.status(401));
  });

  it("should complete request when correct authentication given", async () => {
    const { containers, users } = await parseConfig(config);

    const app = createServer(false, containers, users);

    return chai
      .request(app)
      .head("/private/com/example/test.txt")
      .auth("user1", "password-password-password")
      .then(res => expect(res).to.have.status(404));
  });
});
