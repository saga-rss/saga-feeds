const mongoose = require('mongoose')
const Promise = require('bluebird')

const logger = require('../../helpers/logger').getLogger()
const Feed = require('../../models/feed')
const Post = require('../../models/post')

module.exports = async (job, done) => {
  const { data } = job

  if (!data.results) {
    logger.warn('This feed did not update', data)
    return done()
  }

  if (data.type !== 'Feed') {
    logger.warn('Received a non-feed job in the feed queue processor', data)
    return done()
  }

  if (!data.feedId || !mongoose.Types.ObjectId.isValid(data.feedId)) {
    logger.warn('Received an invalid Feed ID in the feed queue processor', data)
    return done()
  }

  logger.debug('Saving the results of a new feed job', {
    queue: job.queue.name,
    data,
  })

  try {
    const { meta, posts } = data.results

    const updatedFeed = await Feed.findOneAndUpdate(
      { _id: data.feedId },
      {
        ...meta,
        scrapeFailureCount: 0, // reset failure count to 0
      },
      {
        new: true,
      },
    )

    let updatedPosts = []
    if (posts.length) {
      updatedPosts = await Promise.map(posts, post => {
        return Post.updateByIdentifier(post.identifier, {
          ...post,
          feed: data.feedId,
        })
      })
    }

    // update the feed post count
    await Feed.updatePostCount(updatedFeed._id)

    return done(null, {
      feed: updatedFeed,
      posts: updatedPosts,
    })
  } catch (error) {
    logger.error('Failed when processing feed job', {
      data,
      error,
      queue: job.queue.name,
    })

    return done(error)
  }
}
