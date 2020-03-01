#!/usr/bin/env node

const STANDALONE = !module.parent;

if (STANDALONE) {
  process.title = "saga-feed-updater";
}

const program = require("commander");

const config = require("../config");
const appInfo = require("../../package.json");
const { refreshFeeds, JOB_TYPE_FEED } = require("../helpers/refreshFeeds");
const mongoose = require("../services/mongoose");
const {
  FeedEndQueueProcess,
  FeedEndQueueStop,
  FeedStartQueueProcess,
  FeedStartQueueStop
} = require("../workers/queues");
const logger = require("../helpers/logger").getLogger();

function FeedUpdaterDaemon(forcedUpdate = false) {
  // controls ability to pause processing
  this.isPaused = false;

  // timer between daemon executions
  this.sleeping = null;

  // force all feeds to update
  this.forcedUpdate = forcedUpdate;
}

FeedUpdaterDaemon.prototype.updateFeeds = function updateFeed() {
  if (this.isPaused) {
    return false;
  }

  logger.info("feeds are updating now");

  refreshFeeds(this.forcedUpdate, JOB_TYPE_FEED).then(() => {
    this.goToSleep(this.updateFeeds);
  });
};

FeedUpdaterDaemon.prototype.goToSleep = function goToSleep(fn) {
  this.sleeping = setTimeout(() => {
    return fn.call(this);
  }, config.feedRefreshInterval);
};

FeedUpdaterDaemon.prototype.start = function start() {
  FeedStartQueueProcess();
  FeedEndQueueProcess();

  if (STANDALONE) {
    return mongoose
      .start()
      .then(() => this.goToSleep(this.updateFeeds))
      .catch(error => {
        logger.error(error.message, { error });
        process.exit(1);
      });
  } else {
    this.updateFeeds();
  }

  logger.info("started feed updater daemon");
};

FeedUpdaterDaemon.prototype.stop = function stop(code) {
  if (this.sleeping) {
    // if there is a timeout, clear it out
    clearTimeout(this.sleeping);
  }

  FeedEndQueueStop();
  FeedStartQueueStop();

  if (STANDALONE) {
    return mongoose
      .stop()
      .then(() => {
        logger.info("stopped feed updater daemon");
        process.exit(code);
      })
      .catch(error => {
        logger.error(error.message, { error });
        return process.exit(1);
      });
  } else {
    // pause the processing
    this.isPaused = true;

    logger.info("paused feed updater daemon");
  }
};

if (STANDALONE) {
  // create standalone daemon
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

  const daemon = new FeedUpdaterDaemon(program.force);

  daemon.start();

  // Graceful shutdown
  const shutdownSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];
  shutdownSignals.forEach(signal => {
    process.on(signal, function() {
      daemon.stop(signal === "SIGINT" ? 1 : 0);
    });
  });
} else {
  // export daemon
  module.exports = FeedUpdaterDaemon;
}
