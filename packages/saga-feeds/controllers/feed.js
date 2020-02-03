const normalizeUrl = require('normalize-url')
const Promise = require('bluebird')
const entities = require('entities')
const { format, subSeconds, isAfter } = require('date-fns')

const { wrapAsync } = require('./utils')
const { processFeed } = require('../parsers/rss')
const { discoverFeeds } = require('../parsers/discovery')
const RSS = require('../models/rss')

const listFeeds = wrapAsync(async (req, res, next) => {
  const query = req.query || {}
  const feeds = await RSS.apiQuery(query)

  res.send(feeds)

  return next()
})

const createFeed = wrapAsync(async (req, res, next) => {
  const feedUrl = req.body.feedUrl

  if (!feedUrl) {
    return res.status(400)
      .json({ message: 'feedUrl required' })
  }

  const normalizedFeedUrl = normalizeUrl(feedUrl)
  const discovered = await discoverFeeds(normalizedFeedUrl)

  if (!discovered.feedUrls) {
    return res.status(404)
      .json({ message: 'no feed urls were found' })
  }

  const newFeeds = []
  const feeds = await Promise.map(discovered.feedUrls, async f => {

    // get the title and url from the discovered results
    const feedTitle = f.title || discovered.site.title
    const feedUrl = normalizeUrl(f.url)

    // attempt to find a matching feed in the db
    let rss = await RSS.findOne({ feedUrl })


    if (!rss
      || (
        isAfter(
          subSeconds(new Date(), 30),
          new Date(rss.lastScrapedDate),
        )
      )
    ) {
      console.log('CONTINUE')
      const response = await RSS.findOneAndUpdate(
        { feedUrl },
        {
          categories: 'RSS',
          description: entities.decodeHTML(feedTitle),
          feedUrl: feedUrl,
          images: {
            favicon: discovered.site.favicon,
          },
          lastScraped: new Date().toISOString(),
          title: entities.decodeHTML(feedTitle),
          url: discovered.site.url,
          valid: true,
        },
        {
          new: true,
          rawResult: true,
          upsert: true,
        },
      )

      rss = response.value
      if (response.lastErrorObject.upserted) {
        newFeeds.push(rss)
      }
    }

    return f
  })

  // const processed = await processFeed(req.body.feedUrl)

  res.send(feeds)

  return next()
})

module.exports = {
  listFeeds,
  createFeed,
}
