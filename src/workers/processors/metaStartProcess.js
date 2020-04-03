const mongoose = require('mongoose')

const { MetaEndQueueAdd } = require('../queues/metaEndQueue')
const MetaHelper = require('../../helpers/meta')
const logger = require('../../helpers/logger').getLogger()

module.exports = async (job, done) => {
  const { data } = job

  if (data.type !== 'Meta') {
    logger.warn('Received a non-meta job in the meta queue processor', data)
    return done()
  }

  if (!data.feedId || !mongoose.Types.ObjectId.isValid(data.feedId)) {
    logger.warn('Received an invalid Feed ID in the feed queue processor', data)
    return done()
  }

  if (!data.url) {
    logger.warn('Unable to process a meta job without a URL', data)
    return done()
  }

  logger.debug('Starting a new meta job', {
    queue: job.queue.name,
    data,
  })

  try {
    const results = await MetaHelper.getMeta(data.url)

    if (results) {
      await MetaEndQueueAdd({
        type: 'Meta',
        feedId: data.feedId,
        url: data.url,
        results,
      })
    }

    return done(null, results)
  } catch (error) {
    logger.error('Failed when processing meta job', {
      data,
      error,
      queue: job.queue.name,
    })

    return done(error)
  }
}
