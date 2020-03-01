#!/usr/bin/env node

const mongoose = require("../services/mongoose");
const program = require("commander");

const appInfo = require("../../package.json");
const logger = require("../helpers/logger").getLogger();

const { refreshFeeds } = require("../helpers/refreshFeeds");

const shutdown = code => {
  mongoose.stop(function() {
    process.exit(code);
  });
};

program
  .version(appInfo.version)
  .option("-v, --verbose", "verbose logging", false)
  .option("-d, --debug", "debug logging", false)
  .option(
    "-f, --force",
    "force all feeds to update even if they are not expired",
    false
  )
  .parse(process.argv);

logger.level(program.debug ? "debug" : program.verbose ? "info" : "error");

mongoose.start(function(error) {
  if (error) {
    shutdown(1);
  }

  // start refreshing feeds
  refreshFeeds(program.force)
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.log(error);
      process.exit(1);
    });
});

const shutdownSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];

shutdownSignals.forEach(signal => {
  process.on(signal, function() {
    shutdown(signal === "SIGINT" ? 1 : 0);
  });
});
