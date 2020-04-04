#!/usr/bin/env node

const STANDALONE = !module.parent

if (STANDALONE) {
  process.title = 'saga-meta-updater'
}

const program = require('commander')

const config = require('../config')
const appInfo = require('../../package.json')
const mongoose = require('../services/mongoose')
const {
  MetaStartQueueAdd,
  MetaEndQueueProcess,
  MetaEndQueueStop,
  MetaStartQueueProcess,
  MetaStartQueueStop,
} = require('../workers/queues')
const logger = require('../helpers/logger').getLogger()
const got = require('../helpers/got')
const Feed = require('../models/Feed')

function MetaUpdaterDaemon(forcedUpdate = false) {
  // controls ability to pause processing
  this.isPaused = false

  // timer between daemon executions
  this.sleeping = null

  // force all feeds to update
  this.forcedUpdate = forcedUpdate
}

MetaUpdaterDaemon.prototype.updateFeedsMeta = function updateFeedsMeta() {
  if (this.isPaused) {
    return false
  }

  logger.info('meta are updating now')

  this.scheduleMetaUpdateJobs(this.forcedUpdate).then(() => {
    this.goToSleep(this.updateFeedsMeta)
  })
}

/**
 * Load feeds via MongoDB cursor to send to bull queues
 * for updating
 * @param {boolean} forceUpdate - should we force the update?
 * @param {string} jobType - the type of job to schedule
 * @returns {Promise<unknown>}
 */
MetaUpdaterDaemon.prototype.scheduleMetaUpdateJobs = async function scheduleMetaUpdateJobs(forceUpdate = false) {
  return Feed.find({
    isPublic: true,
    scrapeFailureCount: { $lt: 5 },
  })
    .sort({ lastScrapedDate: 'asc' })
    .cursor()
    .eachAsync(async doc => {
      if (!doc.feedUrl) return Promise.resolve()

      try {
        const freshFeed = await got.get(doc.feedUrl)

        const willUpdate = forceUpdate || doc.feedNeedsUpdating(freshFeed.headers)

        if (willUpdate) {
          await MetaStartQueueAdd(
            {
              type: 'Feed',
              feedId: doc._id,
              url: doc.feedUrl,
              shouldUpdate: willUpdate,
            },
            { removeOnComplete: true, removeOnFail: true },
          )
        }

        return Promise.resolve(doc)
      } catch (error) {
        logger.error(`Problem updating meta`, { error, doc })

        await Feed.addScrapeFailure(doc._id)

        if (error.response && error.response.status === 404) {
          // this feed doesn't exist
          await Feed.setPublic(doc._id, false)
        }

        return Promise.resolve()
      }
    })
    .catch(error => {
      logger.error(`Problem updating meta`, { error })
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
    return mongoose
      .start()
      .then(() => this.goToSleep(this.updateFeedsMeta))
      .catch(error => {
        logger.error(error.message, { error })
        process.exit(1)
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
    return mongoose
      .stop()
      .then(() => {
        logger.info('stopped feed updater daemon')
        process.exit(code)
      })
      .catch(error => {
        logger.error(error.message, { error })
        return process.exit(1)
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

  logger.level(program.debug ? 'debug' : program.verbose ? 'info' : config.logLevel)

  const daemon = new MetaUpdaterDaemon(program.force)

  daemon.start()

  // Graceful shutdown
  const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT']
  shutdownSignals.forEach(signal => {
    process.on(signal, function() {
      daemon.stop(signal === 'SIGINT' ? 1 : 0)
    })
  })
} else {
  // export daemon
  module.exports = MetaUpdaterDaemon
}
