const { describe, it, before } = require("mocha");
const { expect } = require("chai");

const { parseConfig } = require("../src/config");
const { getContainer, getRepository } = require("../src/router");

const config = {
  repositories: [
    {
      name: "repo1",
      path: "/tmp",
      prefixes: ["net.example"]
    },
    {
      name: "repo2",
      path: "/tmp",
      prefixes: ["com.example"]
    },
    {
      name: "repo3",
      path: "/tmp",
      prefixes: "any"
    }
  ],
  groups: [
    {
      name: "all",
      repositories: "all"
    }
  ]
};

let containers = null;

describe("router", () => {
  before(async () => {
    const result = await parseConfig(config);
    containers = result.containers;
  });

  it("should return the correct container", () => {
    const container = getContainer(containers, { path: "/repo1/xyz" });
    expect(container).to.have.property("name", "repo1");
  });

  it("should return no repository", () => {
    const container = getContainer(containers, { path: "/repo1/xyz" });
    const repository = getRepository(container, { path: "/repo1/xyz" });
    expect(repository).to.be.null;
  });

  it("should return the correct repository", () => {
    const path = "/repo1/net/example";
    const container = getContainer(containers, { path });
    const repository = getRepository(container, { path });
    expect(repository).to.have.property("name", "repo1");
  });

  it("should return the correct container for group", () => {
    const path = "/all/com/example/test/123";
    const container = getContainer(containers, { path });
    const repository = getRepository(container, { path });
    expect(repository).to.have.property("name", "repo2");
  });

  it("should return the fallback container for group", () => {
    const path = "/all/org/example";
    const container = getContainer(containers, { path });
    const repository = getRepository(container, { path });
    expect(repository).to.have.property("name", "repo3");
  });
});
