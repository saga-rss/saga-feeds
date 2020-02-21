const normalizeUrl = require('normalize-url')
const mongoose = require('mongoose')
const Promise = require('bluebird')

const { wrapAsync } = require('./utils')
const { discoverFeeds } = require('../helpers/discovery')
const Feed = require('../models/feed')
const Post = require('../models/post')
const { processFeed } = require('../helpers/processFeed')

const listFeeds = wrapAsync(async (req, res, next) => {
  const query = req.query || {}
  const feeds = await Feed.apiQuery(query)

  res.send(feeds.map(feed => feed.detailView()))

  return next()
})

const createFeed = wrapAsync(async (req, res, next) => {
  const feedUrl = req.body.feedUrl

  if (!feedUrl) {
    return res.status(400).json({ message: 'feedUrl required' })
  }

  const normalizedFeedUrl = normalizeUrl(feedUrl)
  const discovered = await discoverFeeds(normalizedFeedUrl)

  if (!discovered || !discovered.feedUrls) {
    return res.status(404).json({ message: 'no feed urls were found' })
  }

  const results = await Promise.mapSeries(discovered.feedUrls, async feedUrl => {
    const { meta, posts } = await processFeed(feedUrl.url, true)

    const feedResponse = await Feed.findOneAndUpdate(
      { identifier: meta.identifier },
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
        return Post.findOneAndUpdate(
          { identifier: post.identifier },
          {
            ...post,
            feed: feedResponse._id,
          },
          { new: true, upsert: true },
        )
      })
    }

    return feedResponse
  })

  res.json(results[0])

  return next()
})

const getFeed = wrapAsync(async (req, res, next) => {
  const feedId = req.params.feedId
  const feed = await Feed.aggregate([
    { $match: { _id: { $in: [mongoose.Types.ObjectId(feedId)] } } },
    {
      $lookup: {
        from: 'post',
        localField: '_id',
        foreignField: 'feed',
        as: 'posts',
      },
    },
  ])

  if (!feed || !feed.length) {
    res.status(404)
    return res.json({ error: 'Feed does not exist.' })
  }

  res.send(feed[0])

  return next()
})

module.exports = {
  listFeeds,
  createFeed,
  getFeed,
}
