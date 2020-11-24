#!/usr/bin/env node

const process = require("process");

const { ArgumentParser } = require("argparse");

const { readConfig } = require("./config");
const { createServer } = require("./server");

const pkg = require("../package.json");

async function main() {
  const parser = new ArgumentParser({
    prog: pkg.name,
    add_help: true,
    description: pkg.description
  });

  parser.add_argument("--version", {
    action: "version",
    version: pkg.version,
    help: "Show version number and exit"
  });

  parser.add_argument("-d", "--debug", {
    action: "store_true",
    help: "Show debugging output"
  });

  parser.add_argument("configFile", {
    metavar: "<config>",
    nargs: "+",
    help: "Configuration file to use"
  });

  const args = parser.parse_args();
  const { debug, configFile } = args;

  const config = await readConfig(...configFile);
  const app = createServer(debug, config);

  const { port } = config;
  app.listen(port, () => console.log(`Server is listening on port ${port}`));
}

main().catch(err => {
  process.exitCode = 1;
  console.error(err);
});
