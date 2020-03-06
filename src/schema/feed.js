const normalizeUrl = require('normalize-url')
const Promise = require('bluebird')
const { ApolloError } = require('apollo-server-express')

const { discoverFeeds } = require('../helpers/discovery')
const { processFeed } = require('../helpers/processFeed')
const logger = require('../helpers/logger').getLogger()

const feedById = async (source, { id }, context) => {
  const feed = await context.models.feed.findById(id)

  if (!feed) {
    throw new ApolloError(`feed not found`, 'NOT_FOUND')
  }

  return feed
}

const feedCreate = async (source, { feedUrl, interests }, context) => {
  const normalizedFeedUrl = normalizeUrl(feedUrl)
  const discovered = await discoverFeeds(normalizedFeedUrl)

  if (!discovered || !discovered.feedUrls) {
    throw new ApolloError('no feed urls were found', 'NOT_FOUND', {
      feedUrl: normalizedFeedUrl,
    })
  }

  const feeds = await Promise.mapSeries(discovered.feedUrls, async feedUrl => {
    // check to see if feed exists
    const exists = await context.models.feed.findOne({ feedUrl: feedUrl.url })
    if (exists) {
      logger.debug(`This feed already exists, and does not need to be created`, {
        feedUrl,
      })
      return exists
    }

    const processed = await processFeed(feedUrl.url, true)

    if (!processed) {
      return {}
    }

    const { meta, posts } = processed

    const feedResponse = await context.models.feed.findOneAndUpdate(
      {
        identifier: meta.identifier,
        interests,
      },
      {
        ...meta,
        feedUrl: normalizeUrl(feedUrl.url),
      },
      {
        new: true,
        upsert: true,
      },
    )

    if (posts.length) {
      await Promise.map(posts, post => {
        return context.models.post.findOneAndUpdate(
          { identifier: post.identifier },
          {
            ...post,
            feed: feedResponse._id,
          },
          { new: true, upsert: true },
        )
      })
    }

    return feedResponse.detailView()
  })

  return feeds
}

const feedPosts = async (source, args, context) => {
  if (source instanceof context.models.feed) {
    const posts = await context.models.post.find({ feed: source.id })
    return posts
  }
  return null
}

const feedSearch = async (source, { sort = 'title', sortDirection = 'asc' }, context) => {
  const feeds = await context.models.feed.find().sort({ [sort]: sortDirection })

  return feeds
}

const feedSubscribe = async (source, { feedId }, context) => {
  await context.models.subscription.subscribe(feedId, context.user.sub)
  const feed = await context.models.feed.findOne(feedId)
  return feed
}

const feedUnsubscribe = async (source, { feedId }, context) => {
  const subscription = await context.models.subscription.unsubscribe(feedId, context.user.sub)
  return subscription
}

module.exports = {
  feedById,
  feedCreate,
  feedPosts,
  feedSearch,
  feedSubscribe,
  feedUnsubscribe,
}
