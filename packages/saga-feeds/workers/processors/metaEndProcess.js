const mongoose = require('mongoose')

const logger = require('../../helpers/logger').getLogger()
const Feed = require('../../models/feed')

module.exports = async (job, done) => {
  const { data } = job

  if (data.type !== 'Meta') {
    logger.warn('Received a non-meta job in the meta queue processor', data)
    return done()
  }

  if (!data.feedId || !mongoose.Types.ObjectId.isValid(data.feedId)) {
    logger.warn('Received an invalid Feed ID in the feed meta processor', data)
    return done()
  }

  logger.debug('Saving the results of a new meta job', {
    queue: job.queue.name,
    data,
  })

  try {
    const updatedFeed = await Feed.updateFeedMeta(data.feedId, data.results)

    return done(null, { feed: updatedFeed })
  } catch (error) {
    logger.error('Failed when processing meta job', {
      data,
      error,
      queue: job.queue.name,
    })

    return done(error)
  }
}
