const { JSDOM } = require('jsdom')
const { URL } = require('url')

const config = require('../config')
const got = require('./got')
const logger = require('./logger').getLogger('helper-meta')

/**
 * Meta helper
 * @module meta.helper
 */
const MetaHelper = {}

MetaHelper.isAbsoluteUrl = function isAbsoluteUrl(url) {
  if (typeof url !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof url}\``)
  }

  // Don't match Windows paths `c:\`
  if (/^[a-zA-Z]:\\/.test(url)) {
    return false
  }

  // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
  // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)
}

/**
 * Extract Open Graph properties from the document head.
 * @param {Object} document DOM
 * @return {Object} open graph properties
 */
MetaHelper.extractOpenGraphProps = function extractOpenGraphProps(document) {
  const result = {}
  if (!document.head) {
    return result
  }
  const metas = document.head.getElementsByTagName('meta')
  for (let tag of metas) {
    const attr = tag.getAttribute('property')
    if (attr !== null && attr.startsWith('og:')) {
      const prop = attr.substr(3)
      result[prop] = tag.getAttribute('content')
    }
  }
  return result
}

MetaHelper.extractHtmlMetas = function extractHtmlMetas(document) {
  let result = {
    canonicalUrl: '',
    favicon: '',
    themeColor: '',
  }
  if (!document.head) {
    return result
  }
  const tags = document.head.getElementsByTagName('link')
  for (let tag of tags) {
    const attr = tag.getAttribute('rel')
    if (attr !== null && attr === 'canonical') {
      result.canonicalUrl = tag.getAttribute('href')
    } else if (attr !== null && (attr === 'icon' || attr === 'shortcut icon')) {
      result.favicon = tag.getAttribute('href')
    }
  }
  const metas = document.head.getElementsByTagName('meta')
  for (let tag of metas) {
    const attr = tag.getAttribute('name')
    if (attr !== null && attr === 'theme-color') {
      result.themeColor = tag.getAttribute('content')
    }
  }
  return result
}

/**
 * Get metadata for URL
 * @param {string} targetUrl HTML URL of the page
 * @returns {Promise<*>} processing promise
 */
MetaHelper.getMeta = async function getMeta(targetUrl) {
  let results = null

  if (!targetUrl) return results

  logger.debug(`Starting meta for url`, {
    url: targetUrl,
  })

  const url = new URL(targetUrl)

  results = {
    author: '',
    canonicalUrl: '',
    description: '',
    favicon: '',
    logo: `https://logo.clearbit.com/${url.hostname}`,
    image: '',
    language: '',
    publisher: '',
    themeColor: '',
    url: '',
  }

  try {
    const { body, headers } = await got(targetUrl)

    if (headers['content-type'].indexOf('html') < 0) {
      // this is a url for something that can't be a webpage
      logger.debug(`This url does not reference HTML, so we cannot get meta data from it`, {
        url: targetUrl,
      })

      return Promise.resolve(results)
    }

    const dom = new JSDOM(body, {
      userAgent: config.userAgent,
    })

    const openGraph = MetaHelper.extractOpenGraphProps(dom.window.document)
    const htmlMetas = MetaHelper.extractHtmlMetas(dom.window.document)

    results = Object.assign({}, results, openGraph, htmlMetas)

    if (results.image.length && !MetaHelper.isAbsoluteUrl(results.image)) {
      results.image = url.origin + results.image
    }

    if (results.favicon.length && !MetaHelper.isAbsoluteUrl(results.favicon)) {
      results.favicon = url.origin + results.favicon
    }

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
