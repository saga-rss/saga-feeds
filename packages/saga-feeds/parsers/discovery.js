const rssFinder = require('rss-finder')

const logger = require('../middlewares/logger')

const discoverFeeds = async url => {
  const log = logger.getLogger('discovery')
  const results = await rssFinder(url)

  log.debug(results)

  return results
}

module.exports = {
  discoverFeeds,
}
