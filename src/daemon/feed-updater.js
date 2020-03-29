#!/usr/bin/env node

const STANDALONE = !module.parent

if (STANDALONE) {
  process.title = 'saga-feed-updater'
}

const program = require('commander')
const Promise = require('bluebird')

const config = require('../config')
const appInfo = require('../../package.json')
const { refreshFeeds, JOB_TYPE_FEED } = require('../helpers/feed')
const mongoose = require('../services/mongoose')
const Feed = require('../models/feed')
const Post = require('../models/post')
const FeedHelper = require('../helpers/feed.helper')
const {
  FeedEndQueueProcess,
  FeedEndQueueStop,
  FeedStartQueueProcess,
  FeedStartQueueStop,
} = require('../workers/queues')
const logger = require('../helpers/logger').getLogger('feed-updater-daemon')

function FeedUpdaterDaemon(forcedUpdate = false) {
  // controls ability to pause processing
  this.isPaused = false

  // set the processing state, so subsequent calls
  // to update are not overlapping
  this.isProcessing = false

  // timer between daemon executions
  this.sleeping = null

  // force all feeds to update
  this.forcedUpdate = forcedUpdate
}

FeedUpdaterDaemon.prototype.updateFeed = function updateFeed(feedId) {
  let processResults = null

  return Feed.findById(feedId)
    .then(feed => FeedHelper.processFeed(feed.feedUrl))
    .then(results => {
      processResults = results

      logger.debug(`updating feed meta`, results.meta)

      return Feed.findOneAndUpdate(
        { _id: feedId },
        {
          ...results.meta,
          scrapeFailureCount: 0, // reset failure count to 0
        },
        {
          new: true,
        },
      )
    })
    .then(() => {
      if (processResults.posts.length) {
        return Promise.map(processResults.posts, post => {
          return Post.updateByIdentifier(post.identifier, {
            ...post,
            feed: feedId,
          })
        })
      } else {
        return null
      }
    })
    .then(() => {
      // update the feed post count
      return Feed.updatePostCount(feedId)
    })
    .then(() => {
      logger.info(`finished updating feed and its posts`, { feedId })
    })
    .catch(logger.error)
}

FeedUpdaterDaemon.prototype.updateFeeds = function updateFeeds() {
  if (this.isPaused || this.isProcessing) {
    return false
  }

  this.isProcessing = true

  logger.info('feeds are updating now')

  return refreshFeeds(this.forcedUpdate, JOB_TYPE_FEED).then(() => {
    this.isProcessing = false

    if (STANDALONE) {
      this.goToSleep(this.updateFeeds)
    } else {
      logger.info('finished updating feeds')
    }
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
    return mongoose
      .start()
      .then(() => this.goToSleep(this.updateFeeds))
      .catch(error => {
        logger.error(error.message, { error })
        process.exit(1)
      })
  } else {
    this.updateFeeds()
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

  const daemon = new FeedUpdaterDaemon(program.force)

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
  module.exports = FeedUpdaterDaemon
}
