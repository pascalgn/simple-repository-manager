const { describe, it } = require("mocha");
const { expect } = require("chai");

const { parseConfig } = require("../src/config");

describe("config", () => {
  describe("parseConfig", () => {
    it("should successfully parse the config", async () => {
      const config1 = {
        repositories: [
          {
            name: "repo1",
            path: "/tmp",
            prefixes: ["com.example"],
            users: [{ type: "authenticated", permissions: "ro" }]
          },
          {
            name: "repo2",
            path: "/tmp",
            prefixes: ["com.example.test"]
          },
          {
            name: "repo3",
            path: "/tmp",
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

      const { containers, users } = await parseConfig(config1, config2);

      expect(containers).to.have.lengthOf(5);
      expect(users).to.have.lengthOf(2);
    });

    it("should report errors for invalid config", async () => {
      const invalid = [
        {},
        { repositories: [] },
        { repositories: [{ name: "name" }] },
        { repositories: [{ name: "name", path: "/", prefixes: "" }] },
        { repositories: [{ name: "name", path: "/", prefixes: "x" }] },
        { repositories: [{ name: "name", path: "/", prefixes: [""] }] }
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
            users: [{ type: "authenticated", permissions: "rw" }]
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

      expect(containers).to.have.lengthOf(2);
      expect(containers.find(c => c.name === "repo")).to.have.property(
        "type",
        "repository"
      );
      expect(containers.find(c => c.name === "all")).to.have.property(
        "type",
        "group"
      );
    });
  });
});
