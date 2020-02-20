const Mercury = require('@postlight/mercury-parser')
const sanitizeHtml = require('sanitize-html')
const normalizeUrl = require('normalize-url')

const config = require('../config')

const getArticleContent = url => {
  return Mercury.parse(url, {
    headers: {
      'user-agent': config.userAgent,
    },
  }).then(results => ({
    ...results,
    lead_image_url: results.url ? normalizeUrl(results.url) : results.url,
    url: results.url ? normalizeUrl(results.url) : results.url,
    content: results.content ? sanitizeHtml(results.content) : results.content,
  }))
}

module.exports = {
  getArticleContent,
}
