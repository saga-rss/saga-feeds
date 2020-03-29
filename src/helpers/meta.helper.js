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
 * @param {string} html Full HTML of the page
 * @returns {Promise<null>} processing promise
 */
MetaHelper.getMeta = async function getMeta(targetUrl, html = '') {
  let results = null

  try {
    if (!html || !html.length > 0) {
      const results = await got(targetUrl)
      html = results.body
    }

    results = await metascraper({ html, url: targetUrl })

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
  }

  return results
}

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
  MetaHelper,
}
