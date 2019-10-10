#!/usr/bin/env node

const process = require("process");

const { ArgumentParser } = require("argparse");

const { readConfig } = require("./config");
const { createServer } = require("./server");

const pkg = require("../package.json");

async function main() {
  const parser = new ArgumentParser({
    prog: pkg.name,
    version: pkg.version,
    addHelp: true,
    description: pkg.description
  });

  parser.addArgument(["-d", "--debug"], {
    action: "storeTrue",
    help: "Show debugging output"
  });

  parser.addArgument(["configFile"], {
    metavar: "<config>",
    nargs: "+",
    help: "Configuration file to use"
  });

  const args = parser.parseArgs();
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
