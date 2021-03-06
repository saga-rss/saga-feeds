#!/usr/bin/env node

const mongoose = require('../services/mongoose')
const program = require('commander')

const appInfo = require('../../package.json')
const logger = require('../helpers/logger').getLogger()

const FeedUpdaterDaemon = require('../daemon/feed-updater')

program
  .version(appInfo.version)
  .option('-v, --verbose', 'verbose logging', false)
  .option('-d, --debug', 'debug logging', false)
  .parse(process.argv)

logger.level(program.debug ? 'debug' : program.verbose ? 'info' : 'error')

mongoose
  .start()
  .then(() => {
    // start refreshing feeds
    const updater = new FeedUpdaterDaemon(true)
    return updater.updateFeeds()
  })
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    logger.error(error.message, { error })
    process.exit(1)
  })
