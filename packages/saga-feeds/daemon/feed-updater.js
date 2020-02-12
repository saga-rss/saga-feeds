#!/usr/bin/env node

const STANDALONE = !module.parent

if (STANDALONE) {
  process.title = 'reader-feed-updater'
}

const program = require('commander')

const config = require('../config')
const appInfo = require('../package.json')
const { refreshFeeds } = require('../workers/refreshFeeds')
const mongoose = require('../services/mongoose')
const {
  FeedEndQueueProcess,
  FeedEndQueueStop,
  FeedStartQueueProcess,
  FeedStartQueueStop,
} = require('../workers/queues')
const logger = require('../middlewares/logger')
  .getLogger()

function FeedUpdaterDaemon() {
  // controls ability to pause processing
  this.isPaused = false

  // timer between daemon executions
  this.sleeping = null
}

FeedUpdaterDaemon.prototype.updateFeed = function updateFeed() {
  if (this.isPaused) {
    return false
  }

  logger.info('nap time is over!')

  refreshFeeds(true)
    .then(() => {
      this.goToSleep(this.updateFeed)
    })
}

FeedUpdaterDaemon.prototype.goToSleep = function goToSleep(fn) {
  this.sleeping = setTimeout(() => {
    return fn.call(this)
  }, config.feedRefreshInterval)
}

FeedUpdaterDaemon.prototype.start = function start() {
  FeedStartQueueProcess()
  FeedEndQueueProcess()

  if (STANDALONE) {
    mongoose.start((error) => {
      if (error) {
        logger.error(error.message, { error })
        process.exit(1)
      }

      this.goToSleep(this.updateFeed)
    })
  } else {
    this.updateFeed()
  }

  logger.info('started feed updater daemon')
}

FeedUpdaterDaemon.prototype.stop = function stop(code) {
  if (this.sleeping) {
    // if there is a timeout, clear it out
    clearTimeout(this.sleeping)
  }

  FeedEndQueueStop()
  FeedStartQueueStop()

  if (STANDALONE) {
    mongoose.stop((error) => {
      if (error) {
        logger.error(error.message, { error })
        return process.exit(1)
      }

      logger.info('stopped feed updater daemon')
      process.exit(code)
    })
  } else {
    // pause the processing
    this.isPaused = true

    logger.info('paused feed updater daemon')
  }
}

if (STANDALONE) {
  // Create standalone daemon. Aka this executable.
  program.version(appInfo.version)
    .option('-v, --verbose', 'Verbose flag')
    .option('-d, --debug', 'Debug flag')
    .parse(process.argv)

  logger.level(program.debug ? 'debug' : program.verbose ? 'info' : 'error')

  const daemon = new FeedUpdaterDaemon()

  daemon.start()

  // Graceful shutdown.
  process.on('SIGINT', function () {
    daemon.stop(1)
  })

  process.on('SIGQUIT', function () {
    daemon.stop(1)
  })
} else {
  // Export daemon instance
  module.exports = new FeedUpdaterDaemon()
}
