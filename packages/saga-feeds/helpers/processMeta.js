const metascraper = require('metascraper')([
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-logo')(),
  require('metascraper-clearbit')(),
  require('metascraper-publisher')(),
  require('metascraper-title')(),
  require('metascraper-url')(),
  require('metascraper-lang')(),
  require('metascraper-author')(),
])

const got = require('../helpers/got')
const logger = require('./logger').getLogger()

const processMeta = async (targetUrl, shouldUpdate) => {
  if (!shouldUpdate) return false

  let results = null

  try {
    const { body: html, url } = await got(targetUrl)
    results = await metascraper({ html, url })

    logger.debug(`Processed meta for url`, {
      targetUrl,
      results,
    })
  } catch (ex) {
    // this could happen if the request 404'd, or
    // some other server error happened.
    logger.warn(`Problem while fetching meta for url`, {
      targetUrl,
      error: {
        message: ex.message,
        stack: ex.stack,
      },
    })
  }

  return results
}

module.exports = {
  processMeta,
}
