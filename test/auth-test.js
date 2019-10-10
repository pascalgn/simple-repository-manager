const { describe, it } = require("mocha");
const { expect } = require("chai");

const { authenticate, authorize } = require("../src/auth");

describe("auth", () => {
  describe("authenticate", () => {
    it("should return the user", async () => {
      const users = [{ name: "user", base64: "dXNlcjpwYXNzd29yZA==" }];
      const headers = { authorization: "Basic dXNlcjpwYXNzd29yZA==" };
      const result = authenticate({ headers }, { users });
      expect(result).to.equal("user");
    });

    it("should return null when not found", async () => {
      const users = [{ name: "user", base64: "dXNlcjpwYXNzd29yZA==" }];
      const headers = { authorization: "Basic dXNlcjpwYXNzd29yZA=" };
      const result = authenticate({ headers }, { users });
      expect(result).to.equal(null);
    });

    it("should return null when no auth header given", async () => {
      const users = [{ name: "user", base64: "dXNlcjpwYXNzd29yZA==" }];
      const headers = { authorization: "Basic " };
      const result = authenticate({ headers }, { users });
      expect(result).to.equal(null);
    });

    it("should return null when no users given", async () => {
      const users = [];
      const headers = { authorization: "Basic dXNlcjpwYXNzd29yZA=" };
      const result = authenticate({ headers }, { users });
      expect(result).to.equal(null);
    });
  });

  describe("authorize", () => {
    it("should allow ro access for user", async () => {
      const users = [{ name: "user", permissions: "ro" }];
      const result = authorize({ method: "GET" }, "user", { users });
      expect(result).to.equal(true);
    });

    it("should allow rw access for user", async () => {
      const users = [{ name: "user", permissions: "rw" }];
      const result = authorize({ method: "POST" }, "user", { users });
      expect(result).to.equal(true);
    });

    it("should disallow rw access for user", async () => {
      const users = [{ name: "user", permissions: "ro" }];
      const result = authorize({ method: "POST" }, "user", { users });
      expect(result).to.equal(false);
    });

    it("should allow ro access for authenticated users", async () => {
      const users = [{ type: "authenticated", permissions: "ro" }];
      const result = authorize({ method: "GET" }, "user", { users });
      expect(result).to.equal(true);
    });

    it("should allow ro access for user, not rw", async () => {
      const users = [
        { type: "authenticated", permissions: "rw" },
        { name: "user", permissions: "ro" }
      ];
      const result = authorize({ method: "POST" }, "user", { users });
      expect(result).to.equal(false);
    });
  });
});
