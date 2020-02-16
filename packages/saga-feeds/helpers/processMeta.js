const metascraper = require('metascraper')([
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-logo')(),
  require('metascraper-clearbit')(),
  require('metascraper-publisher')(),
  require('metascraper-title')(),
  require('metascraper-url')(),
  require('metascraper-lang')(),
])

const got = require('got')

const logger = require('./logger').getLogger()

const processMeta = async targetUrl => {
  const { body: html, url } = await got(targetUrl)
  const results = await metascraper({ html, url })

  logger.debug(`Processed meta for url`, {
    targetUrl,
    results,
  })

  return results
}

module.exports = {
  processMeta,
}
