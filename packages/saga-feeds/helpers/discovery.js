const rssFinder = require('rss-finder')

const got = require('../helpers/got')
const logger = require('./logger').getLogger()

const validContentTypes = [
  'application/rss+xml',
  'application/atom+xml',
  'application/rdf+xml',
  'application/rss',
  'application/atom',
  'application/rss+xml;charset=UTF-8',
]

const discoverFeeds = async url => {
  const discoveryResults = await rssFinder(url)
  const feedResults = await got.get(url).catch(ex => {
    logger.warn(`Problem while discovering feeds`, {
      feedUrl: url,
      error: {
        message: ex.message,
        stack: ex.stack,
      },
    })

    return null
  })

  const contentType = feedResults.headers['content-type']
  if (contentType && validContentTypes.indexOf(contentType) >= 0) {
    discoveryResults.feedUrls = [
      {
        ...discoveryResults.feedUrls[0],
        url,
      },
    ]
  }

  logger.debug(discoveryResults)

  return discoveryResults
}

module.exports = {
  discoverFeeds,
}
