const mongoose = require('mongoose')
const Promise = require('bluebird')

const logger = require('../../middlewares/logger').getLogger()
const Feed = require('../../models/feed')
const Post = require('../../models/post')

module.exports = async (job, done) => {
  const {data} = job

  if (data.type !== 'Feed') {
    logger.warn('Received a non-rss job in the feed queue processor', data)
    return done()
  }

  if (!data.rssId || !mongoose.Types.ObjectId.isValid(data.rssId)) {
    logger.warn('Received an invalid rss ID in the feed queue processor', data)
    return done()
  }

  logger.debug('Saving the results of a new rss job', {
    queue: job.queue.name,
    data,
  })

  try {
    const { meta, posts } = data.results

    const updatedFeed = await Feed.findOneAndUpdate(
      { _id: data.rssId },
      meta,
      {
        new: true,
      },
    )

    let updatedPosts = []
    if (posts.length) {
      updatedPosts = await Promise.map(posts, post => {
        return Post.findOneAndUpdate(
          { identifier: post.identifier },
          {
            ...post,
            feed: data.rssId,
          },
          { new: true, upsert: true },
        )
      })
    }

    console.log(updatedPosts)

    return done(null, {
      feed: updatedFeed,
      posts: updatedPosts,
    })
  } catch (error) {
    logger.error('Failed when processing rss job', {
      data,
      error,
      queue: job.queue.name,
    })

    return done(error)
  }
}
