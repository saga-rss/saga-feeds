const rssFinder = require('rss-finder')
const got = require('got')

const logger = require('../middlewares/logger').getLogger()

const validContentTypes = [
  'application/rss+xml',
  'application/atom+xml',
  'application/rdf+xml',
  'application/rss',
  'application/atom',
]

const discoverFeeds = async url => {
  const discoveryResults = await rssFinder(url)
  const feedResults = await got.get(url)

  const contentType = feedResults.headers['content-type']
  if (contentType && validContentTypes.indexOf(contentType) >= 0) {
    discoveryResults.feedUrls = [{
      url,
    }]
  }

  logger.debug(discoveryResults)

  return discoveryResults
}

module.exports = {
  discoverFeeds,
}
