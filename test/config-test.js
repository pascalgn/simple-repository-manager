const { describe, it } = require("mocha");
const { expect } = require("chai");

const { parseConfig } = require("../src/config");

const config1 = {
  repositories: [
    {
      name: "repo1",
      path: "/tmp",
      prefixes: ["com.example"],
      users: [{ type: "anonymous", permissions: "ro" }]
    },
    { name: "repo2", path: "/tmp", prefixes: ["com.example.test"] },
    {
      name: "repo3",
      path: "/tmp",
      prefixes: "any",
      users: [{ name: "testuser1", permissions: "rw" }]
    }
  ],
  groups: [
    {
      name: "group1",
      repositories: ["repo1", "repo3"],
      users: [{ type: "authenticated", permissions: "ro" }]
    },
    {
      name: "group2",
      repositories: ["repo2", "repo3"],
      users: [
        { name: "testuser1", permissions: "ro" },
        { name: "testuser2", permissions: "ro" }
      ]
    }
  ]
};

const config2 = {
  users: [
    { name: "testuser1", password: "abcdefghijklmnopqrstuvwxyz" },
    { name: "testuser2", password: "abcdefghijklmnopqrstuvwxyz" }
  ]
};

describe("config", () => {
  it("should successfully parse the config", async () => {
    const { containers, users } = await parseConfig(config1, config2);

    expect(containers).to.have.property("repo1");
    expect(containers).to.have.property("group1");

    expect(users).to.have.property(
      "dGVzdHVzZXIxOmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6"
    );
  });

  it("should report errors for invalid config", async () => {
    const invalid = [
      {},
      { repositories: [] },
      { repositories: [{ name: "name" }] },
      { repositories: [{ name: "name", path: "/" }] },
      { repositories: [{ name: "name", path: "/", prefixes: "" }] },
      { repositories: [{ name: "name", path: "/", prefixes: "x" }] },
      { repositories: [{ name: "name", path: "/", prefixes: [] }] }
    ];
    for (const config of invalid) {
      const err = await parseConfig(config).catch(e => Promise.resolve(e));
      expect(err).to.have.property("message");
    }
  });

  it("should successfully parse a valid config", async () => {
    const config = {
      repositories: [
        {
          name: "repo",
          path: "/",
          prefixes: ["com.example"],
          users: [{ name: "user1", permissions: "rw" }]
        }
      ],
      groups: [
        {
          name: "all",
          repositories: ["repo"],
          users: [
            { type: "authenticated", permissions: "rw" },
            { type: "anonymous", permissions: "ro" }
          ]
        }
      ],
      users: [
        {
          name: "user1",
          password: "password-password-password"
        }
      ]
    };

    const { containers } = await parseConfig(config);

    expect(containers).to.have.property("all");
    expect(containers).to.have.property("repo");
  });
});
