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

const got = require('./got')
const logger = require('./logger').getLogger()

/**
 * Meta helper
 * @module meta.helper
 */
const MetaHelper = {}

/**
 * Get metadata for URL
 * @param {string} targetUrl HTML URL of the page
 * @returns {Promise<null>} processing promise
 */
MetaHelper.getMeta = async function getMeta(targetUrl) {
  let results = null

  if (!targetUrl) return results

  try {
    const { body, headers } = await got(targetUrl)

    if (headers['content-type'] !== 'text/html') {
      logger.debug(`This url does not reference HTML, so we cannot get meta data from it`, {
        url: targetUrl,
      })

      return Promise.resolve(null)
    }

    results = await metascraper({ body, url: targetUrl })

    logger.debug(`Processed meta for url`, {
      url: targetUrl,
      results,
    })
  } catch (error) {
    // this could happen if the request 404'd, or
    // some other server error happened.
    logger.warn(`Problem while fetching meta for url`, {
      url: targetUrl,
      error,
    })

    return null
  }

  return results
}

module.exports = MetaHelper
