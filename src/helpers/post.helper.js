const normalizeUrl = require('normalize-url')
const Mercury = require('@postlight/mercury-parser')
const sanitizeHtml = require('sanitize-html')
const strip = require('strip')
const entities = require('entities')
const crypto = require('crypto')

const logger = require('./logger').getLogger()
const config = require('../config')
const Post = require('../models/post')
const MetaHelper = require('./meta.helper')

/**
 * Post helpers
 * @module post.helper
 */
const PostHelper = {}

/**
 * Normalize a post (from an RSS feed), so that it fits our model
 *
 * @param post - the RSS item
 * @returns {object} - a processed & normalized post
 */
PostHelper.normalizePost = async function normalizePost(post) {
  const postMeta = await MetaHelper.getMeta(post.link)

  const processed = {
    postType: post.postType,
    summary: postMeta ? postMeta.description : '',
    description: strip(entities.decodeHTML(post.summary || post.description || '')),
    enclosures: PostHelper.processFeedItemEnclosures(post.enclosures),
    guid: post.guid,
    publishedDate: post.pubdate || post.pubDate,
    title: post.title,
    url: post.link ? normalizeUrl(post.link) : '',
    commentUrl: post.comments,
    images: {
      featured: postMeta && postMeta.image ? postMeta.image : post.image ? post.image.url : '',
      logo: postMeta ? postMeta.logo : '',
    },
    identifier: PostHelper.createPostIdentifier(post.guid, post.link, post.enclosures),
    interests: [],
    author: postMeta ? postMeta.author : '',
  }

  if (post.categories) {
    processed.interests = post.categories
  }

  if (post['media:content']) {
    const content = post['media:content']
    processed.enclosures = PostHelper.processFeedItemMediaContent(content, processed.enclosures)

    if (content['media:credit']) {
      if (Array.isArray(content['media:credit'])) {
        content['media:credit'].map(credit => processed.interests.push(credit['#']))
      } else {
        processed.interests.push(content['media:credit']['#'])
      }
    }
  }

  if (post['media:group']) {
    if (Array.isArray(post['media:group']['media:content'])) {
      post['media:group']['media:content'].map(content => {
        processed.enclosures = PostHelper.processFeedItemMediaContent(content, processed.enclosures)
      })
    }
  }

  if (post['yt:videoid']) {
    const youtubeId = post['yt:videoid']['#']

    processed.enclosures.push({
      type: 'youtube',
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
    })

    if (post['media:group'] && !processed.description) {
      processed.description = post['media:group']['media:description']['#']
    }
  }

  if (post['atom:author']) {
    processed.author = post['atom:author']['name'] ? post['atom:author']['name']['#'] : ''
  }

  processed.enclosures = PostHelper.filterFeedItemEnclosures(processed.enclosures)

  if (processed.enclosures.length && (!processed.images.featured || !processed.images.featured.length)) {
    // if there is not a featured image, and there are enclosures,
    // try to find an enclosure image to use as the featured image.
    const images = processed.enclosures.filter(enclosure => enclosure.medium === 'image')
    if (images.length) {
      processed.images.featured = images[0].url
    }
  }

  logger.info(`processed and normalized post`, {
    ...processed,
  })

  return processed
}

/**
 * Create a post identifier from some of the fields of the RSS
 * item. This is used to attempt preventing duplicate posts
 * from a single feed. This is not a very stable
 *
 * @param {string} guid - the RSS item GUID, which is not always set
 * @param {string} link - the RSS item link
 * @param {array} enclosures - the array of enclosures on the RSS item
 * @returns {string}
 */
PostHelper.createPostIdentifier = function createPostIdentifier(guid, link, enclosures) {
  // start the id with the guid and link
  let id = `${guid}:${link}`

  // if there is an enclosure, try to use the first
  // enclosure's url in the id. it seems not so likely
  // to change
  if (enclosures && enclosures.length) {
    id += `:${enclosures[0].url}`
  }
  return crypto
    .createHash('md5')
    .update(id)
    .digest('hex')
}

/**
 * Attempt to normalize a media:content item(s, so that it looks
 * the same as an enclosure
 *
 * @param {object} content - a media:content item from the RSS item
 * @param {array} enclosures - list of enclosures on the RSS item
 * @returns {*}
 */
PostHelper.processFeedItemMediaContent = function processFeedItemMediaContent(content, enclosures) {
  if (Array.isArray(content)) {
    content.forEach(c => {
      const mainContent = c['@']
      processor(mainContent)
    })
  } else {
    const mainContent = content['@']
    processor(mainContent)
  }

  function processor(item) {
    let type = item.medium

    if (!type && item.type) {
      if (item.type.indexOf('audio') >= 0) {
        type = 'audio'
      } else if (item.type.indexOf('video') >= 0) {
        type = 'video'
      }
    }

    const contentTitle = content['media:title'] ? content['media:title']['#'] : item['media:title'] || ''
    const contentDescription = content['media:description']
      ? content['media:description']['#']
      : item['media:description'] || ''

    enclosures.push({
      url: item.url,
      type: item.type || '',
      length: item.filesize || item.length || '',
      width: item.width || '',
      height: item.height || '',
      title: contentTitle,
      description: contentDescription,
      medium: type,
    })
  }

  return enclosures
}

/**
 * Try to normalize enclosures into a list of media, where
 * we can define media type (image, audio, video)
 * @param {array} enclosures - enclosures parsed out of feed
 * @returns {*[]|*} array of processed enclosures
 */
PostHelper.processFeedItemEnclosures = function processFeedItemEnclosures(enclosures) {
  if (!enclosures || !Array.isArray(enclosures) || !enclosures.length || !enclosures[0].type) {
    return []
  }

  return enclosures.map(enclosure => {
    let medium = ''
    if (enclosure.type.indexOf('audio') >= 0) {
      medium = 'audio'
    } else if (enclosure.type.indexOf('video') >= 0) {
      medium = 'video'
    } else if (enclosure.type.indexOf('image') >= 0) {
      medium = 'image'
    }
    return {
      ...enclosure,
      medium,
    }
  })
}

/**
 * Ensure that each enclosure is unique. Also, sort by size,
 * so that the largest one is first.
 *
 * @param {array} enclosures - list of enclosures on the RSS item
 * @returns {array} - filtered and sorted enclosures
 */
PostHelper.filterFeedItemEnclosures = function filterFeedItemEnclosures(enclosures) {
  if (!enclosures || !Array.isArray(enclosures) || !enclosures.length) {
    return []
  }

  const filtered = []
  const urls = []

  enclosures.forEach(enclosure => {
    if (urls.indexOf(enclosure.url) >= 0) {
      return false
    } else {
      filtered.push(enclosure)
      urls.push(enclosure.url)
    }
  })

  const sorted = filtered.sort((a, b) => {
    return parseInt(b.length || 0) - parseInt(a.length || 0)
  })

  return sorted
}

/**
 * Indicate the post is not available on the internet
 * (e.g. 404 when trying to get the post)
 * @param {string} id - Post ID
 * @returns {Promise<*>} - processing promise
 */
PostHelper.setUnavailable = async function setUnavailable(id) {
  logger.debug(`post cannot be found on the internet`, { postId: id })
  await Post.findOneAndUpdate(({ _id: id }, { isPublic: false }))
  return Post.findById(id)
}

/**
 * Update post meta
 * @param {string} id - Post ID
 * @param {object} meta - metadata as provided by Metascraper
 * @returns {Promise<T>} - processing promise
 */
PostHelper.updateMeta = async function updateMeta(id, meta) {
  let post = await Post.findById(id)

  if (!post) {
    logger.warn(`post not found when trying to update meta`, { postId: id })
    return Promise.resolve(null)
  }

  if (!meta) {
    post = PostHelper.setUnavailable(id)
    return post
  }

  const updates = {
    summary: meta.description,
  }

  if (meta.image) {
    updates.images = {
      featured: meta.image,
    }
  }

  if (meta.author) {
    updates.author = meta.author
  }

  await Post.findOneAndUpdate({ _id: id }, updates, { new: true })
  await Post.setStaleDate(id)
  return Post.findById(id)
}

/**
 * Get Post metadata
 * @param {string} id - Post ID
 * @param {string=} html - The full HTML of the page
 * @returns {Promise<T>}
 */
PostHelper.getMeta = async function getMeta(id, html = '') {
  let post = await Post.findById(id)

  if (!post) {
    logger.warn(`post not found when trying to update meta`, { postId: id })
    return Promise.resolve(null)
  }

  const meta = await MetaHelper.getMeta(post.url, html)

  return meta
}

/**
 * Update the content of a post
 * @param {string} id - Post ID
 * @param {object} parsed - Post content results from @postlight/mercury-parser
 * @returns {Promise<T>} - processing promise
 */
PostHelper.updateContent = async function updateContent(id, parsed) {
  let post = await Post.findById(id)

  if (!post) {
    logger.warn(`post not found when trying to update content`, { postId: id })
    return Promise.resolve(null)
  }

  if (!parsed) {
    post = PostHelper.setUnavailable(id)
    return post
  }

  const updated = {
    content: parsed.content,
    direction: parsed.direction,
    wordCount: parsed.word_count,
  }

  if (parsed.lead_image_url && !post.images.featured) {
    updated.images = {
      featured: parsed.lead_image_url,
    }
  }

  return Post.findOneAndUpdate({ _id: id }, updated, { new: true })
}

/**
 * Get content of a post
 * @param {string} url - The HTML URL of the post
 * @param {string=} html - The HTML of the original post
 * @returns {Promise<T>} - processing promise
 */
PostHelper.getContent = function getContent(url, html = '') {
  if (!url) {
    return Promise.resolve('')
  }

  const mercuryOptions = {
    headers: {
      'user-agent': config.userAgent,
    },
  }

  if (html && html.length > 0) {
    mercuryOptions.html = html
  }

  return Mercury.parse(url, mercuryOptions)
    .then(results => ({
      ...results,
      lead_image_url: results.lead_image_url ? normalizeUrl(results.lead_image_url) : results.lead_image_url,
      url: results.url ? normalizeUrl(results.url) : results.url,
      content: results.content ? sanitizeHtml(results.content) : results.content,
    }))
    .catch(error => {
      logger.warn(`Problem while trying to get article content`, {
        url,
        error: {
          message: error.message,
          stack: error.stack,
        },
      })

      return ''
    })
}

module.exports = PostHelper
