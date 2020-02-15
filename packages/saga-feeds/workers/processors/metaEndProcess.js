const mongoose = require('mongoose')
const { formatISO, addHours } = require('date-fns')

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
    const updatedFeed = await Feed.findOneAndUpdate(
      { _id: data.feedId },
      {
        summary: data.results.description,
        images: {
          logo: data.results.logo,
          openGraph: data.results.image,
        },
        publisher: data.results.publisher,
        metaStaleDate: formatISO(addHours(new Date(), 1)),
      },
      {
        new: true,
      },
    )

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
