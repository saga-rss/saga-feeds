#!/usr/bin/env node

const mongoose = require('../services/mongoose')
const program = require('commander')

const appInfo = require('../../package.json')
const logger = require('../helpers/logger').getLogger()

const FeedUpdaterDaemon = require('../daemon/feed-updater')

program
  .version(appInfo.version)
  .option('-f, --feed <feedId>', 'MongoDB feed ID', null)
  .option('-v, --verbose', 'verbose logging', false)
  .option('-d, --debug', 'debug logging', false)
  .parse(process.argv)

logger.level(program.debug ? 'debug' : program.verbose ? 'info' : 'error')

if (!program.feed) {
  logger.info('no feed id was provided')
  process.exit(0)
}

mongoose
  .start()
  .then(() => {
    logger.info(`refreshing feed`, { feedId: program.feed })

    // start refreshing feed
    const updater = new FeedUpdaterDaemon(true)
    return updater.updateFeed(program.feed).then(() => {
      process.exit(0)
    })
  })
  .catch(error => {
    logger.error(error.message, { error })
    process.exit(1)
  })
