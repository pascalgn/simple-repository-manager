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

const rawConfig = {
  repositories: [
    {
      name: "repo1",
      prefixes: ["com.example", "org.example"],
      users: [{ name: "user1", permissions: "rw" }]
    },
    {
      name: "repo2",
      prefixes: ["com.example"],
      users: [{ name: "user1", permissions: "rw" }]
    }
  ],
  groups: [
    {
      name: "all",
      repositories: "all",
      users: [{ type: "authenticated", permissions: "rw" }]
    },
    {
      name: "private",
      repositories: "all",
      users: [{ name: "user1", permissions: "ro" }]
    }
  ],
  users: [
    {
      name: "user1",
      password: "password-password-password"
    }
  ]
};

let config = null;

describe("server", () => {
  beforeEach(async () => {
    const { path } = await dir();
    tmpdir = path;
    for (const repository of rawConfig.repositories) {
      repository.path = tmpdir;
    }
    config = await parseConfig(JSON.parse(JSON.stringify(rawConfig)));
  });

  afterEach(async () => {
    if (tmpdir) {
      await remove(tmpdir);
    }
  });

  it("should successfully push data to the server", async () => {
    const app = createServer(false, config);
    return chai
      .request(app)
      .put("/repo1/com/example/test.txt")
      .auth("user1", "password-password-password")
      .then(res => expect(res).to.have.property("text", "OK"));
  });

  it("should read data from the server", async () => {
    const app = createServer(false, config);

    const agent = chai.request(app).keepOpen();
    try {
      const text = "Test 1234";

      await agent
        .put("/repo1/com/example/test.txt")
        .auth("user1", "password-password-password")
        .send(text);

      const head = await agent
        .head("/all/com/example/test.txt")
        .auth("user1", "password-password-password");
      expect(head.header).to.have.property("content-length", `${text.length}`);

      const get = await agent
        .get("/all/com/example/test.txt")
        .auth("user1", "password-password-password");
      expect(get).to.have.property("text", text);
    } finally {
      await agent.close();
    }
  });

  it("should return 405 when pushing wrong prefix", async () => {
    const app = createServer(false, config);
    return chai
      .request(app)
      .put("/repo2/org/example/test.txt")
      .auth("user1", "password-password-password")
      .then(res => expect(res).to.have.status(405));
  });

  it("should return 405 when pushing to group", async () => {
    const app = createServer(false, config);
    return chai
      .request(app)
      .put("/all/com/example/test.txt")
      .auth("user1", "password-password-password")
      .then(res => expect(res).to.have.status(405));
  });

  it("should return 401 when wrong authentication given", async () => {
    const app = createServer(false, config);
    return chai
      .request(app)
      .get("/private/com/example/test.txt")
      .auth("user1", "incorrect")
      .then(res => expect(res).to.have.status(401));
  });

  it("should complete request when correct authentication given", async () => {
    const app = createServer(false, config);
    return chai
      .request(app)
      .head("/private/com/example/test.txt")
      .auth("user1", "password-password-password")
      .then(res => expect(res).to.have.status(404));
  });
});
