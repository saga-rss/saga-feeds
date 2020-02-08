#!/usr/bin/env node

const processTitle = 'saga-feed-updater'

const mongoose = require('../services/mongoose')
const got = require('got')
const program = require('commander')
const EventEmitter = require('events').EventEmitter

const appInfo = require('../package.json')
const logger = require('../middlewares/logger')
  .getLogger(processTitle)
const Feed = require('../models/feed')
const {
  FeedStartQueueAdd,
  FeedStartQueueProcess,
  FeedStartQueueStop,
} = require('../workers/queues/feedStartQueue')
const {
  FeedEndQueueProcess,
  FeedEndQueueStop,
} = require('../workers/queues/feedEndQueue')
const { shouldFeedPostsUpdate } = require('../util/rss')

const STANDALONE = !module.parent

async function processFeeds() {
  logger.info(`Starting the RSS daemon`)

  FeedStartQueueProcess()
  FeedEndQueueProcess()

  return Feed.find()
    .sort({ lastScrapedDate: 'asc' })
    .cursor()
    .eachAsync(async doc => {
      if (!doc.feedUrl) return Promise.resolve()

      const freshFeed = await got.get(doc.feedUrl)

      const willUpdate = shouldFeedPostsUpdate(doc.lastScrapedDate, freshFeed.headers)

      // console.log(willUpdate, doc)

      if (true) {
        await FeedStartQueueAdd({
          type: 'Feed',
          rssId: doc._id,
          url: doc.feedUrl,
        })
      }

      return Promise.resolve(doc)
    })
}

async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down.`)
  try {
    await FeedStartQueueStop()
    await FeedEndQueueStop()
    mongoose.connection && mongoose.connection.close()
  } catch (err) {
    logger.error(`Failure during RSS worker shutdown: ${err.message}`)
    process.exit(1)
  }
  process.exit(0)
}

if (STANDALONE) {
  process.title = processTitle

  program.version(appInfo.version)
    .option('-v, --verbose', 'Verbose flag')
    .option('-d, --debug', 'Debug flag')
    .parse(process.argv)

  logger.level(program.debug ? 'debug' : program.verbose ? 'info' : 'error')

  mongoose.connect()

  // start daemon
  processFeeds()
    .then(() => {
      return shutdown('SIGTERM')
    })
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.log(error)
      process.exit(1)
    })

  // Graceful shutdown.
  //   ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  //   process.on(signal, () => shutdown(signal))
  // })
}
