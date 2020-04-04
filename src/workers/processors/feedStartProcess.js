const mongoose = require('mongoose')

const { FeedEndQueueAdd } = require('../queues/feedEndQueue')
const FeedHelper = require('../../helpers/feed')
const logger = require('../../helpers/logger').getLogger()

module.exports = async (job, done) => {
  const { data } = job

  if (data.type !== 'Feed') {
    logger.warn('Received a non-feed job in the feed queue processor', data)
    return done()
  }

  if (!data.feedId || !mongoose.Types.ObjectId.isValid(data.feedId)) {
    logger.warn('Received an invalid Feed ID in the feed queue processor', data)
    return done()
  }

  logger.debug('Starting a new feed job', {
    queue: job.queue.name,
    data,
  })

  try {
    const results = await FeedHelper.fetchFeed(data.url)

    await FeedEndQueueAdd({
      type: 'Feed',
      feedId: data.feedId,
      url: data.feedUrl,
      results,
    })

    return done(null, results)
  } catch (error) {
    logger.error('Failed when processing feed job', {
      data,
      error,
      queue: job.queue.name,
    })

    return done(error)
  }
}
