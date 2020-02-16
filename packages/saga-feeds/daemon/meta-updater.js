#!/usr/bin/env node

const STANDALONE = !module.parent

if (STANDALONE) {
  process.title = 'saga-meta-updater'
}

const program = require('commander')

const config = require('../config')
const appInfo = require('../package.json')
const mongoose = require('../services/mongoose')
const {
  MetaEndQueueProcess,
  MetaEndQueueStop,
  MetaStartQueueProcess,
  MetaStartQueueStop,
} = require('../workers/queues')
const { refreshFeeds, JOB_TYPE_META } = require('../helpers/refreshFeeds')
const logger = require('../helpers/logger').getLogger()

function MetaUpdaterDaemon(forcedUpdate = false) {
  // controls ability to pause processing
  this.isPaused = false

  // timer between daemon executions
  this.sleeping = null

  // force all feeds to update
  this.forcedUpdate = forcedUpdate
}

MetaUpdaterDaemon.prototype.updateFeedsMeta = function updateFeed() {
  if (this.isPaused) {
    return false
  }

  refreshFeeds(this.forcedUpdate, JOB_TYPE_META).then(() => {
    this.goToSleep(this.updateFeedsMeta)
  })
}

MetaUpdaterDaemon.prototype.goToSleep = function goToSleep(fn) {
  this.sleeping = setTimeout(() => {
    return fn.call(this)
  }, config.metaRefreshInterval)
}

MetaUpdaterDaemon.prototype.start = function start() {
  MetaStartQueueProcess()
  MetaEndQueueProcess()

  if (STANDALONE) {
    mongoose.start(error => {
      if (error) {
        logger.error(error.message, { error })
        process.exit(1)
      }

      this.updateFeedsMeta()
    })
  } else {
    this.updateFeedsMeta()
  }

  logger.info('started meta updater daemon')
}

MetaUpdaterDaemon.prototype.stop = function stop(code) {
  if (this.sleeping) {
    // if there is a timeout, clear it out
    clearTimeout(this.sleeping)
  }

  MetaStartQueueStop()
  MetaEndQueueStop()

  if (STANDALONE) {
    mongoose.stop(error => {
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
  // create standalone daemon
  program
    .version(appInfo.version)
    .option('-v, --verbose', 'verbose logging', false)
    .option('-d, --debug', 'debug logging', false)
    .option('-f, --force', 'force all feeds to update even if they are not expired', false)
    .parse(process.argv)

  logger.level(program.debug ? 'debug' : program.verbose ? 'info' : 'error')

  const daemon = new MetaUpdaterDaemon(program.force)

  daemon.start()

  // Graceful shutdown.
  process.on('SIGINT', function() {
    daemon.stop(1)
  })

  process.on('SIGQUIT', function() {
    daemon.stop(1)
  })
} else {
  // export daemon
  module.exports = MetaUpdaterDaemon
}
