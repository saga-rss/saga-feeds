const FeedParser = require('feedparser')
const normalizeUrl = require('normalize-url')
const { addHours, formatISO } = require('date-fns')
const Promise = require('bluebird')
const url = require('url')
const crypto = require('crypto')

const got = require('./got')
const logger = require('./logger').getLogger('helper-feed')
const PostHelper = require('./post')
const MetaHelper = require('./meta')
const Feed = require('../models/feed')
const Post = require('../models/post')

/**
 * Feed helper
 * @module feed.helper
 */
const FeedHelper = {}

/**
 * Create a new feed in the system
 * @param {string} feedUrl - The RSS feed URL
 * @param {object=} partialDocument - A partial document,
 * matching the Feed model properties
 * @returns {Promise<*>} - processing promise
 */
FeedHelper.createFeed = async function createFeed(feedUrl, partialDocument) {
  const { meta, posts } = await FeedHelper.fetchFeed(feedUrl)

  const initial = Object.assign({}, meta, partialDocument)

  // create the feed
  const createdFeed = await Feed.findOneAndUpdate(
    {
      identifier: meta.identifier,
    },
    {
      ...initial,
      feedUrl: normalizeUrl(feedUrl),
    },
    {
      new: true,
      upsert: true,
    },
  )

  // create posts if there are any
  if (posts.length) {
    await Promise.map(posts, post => {
      return Post.findOneAndUpdate(
        { identifier: post.identifier },
        {
          ...post,
          feed: createdFeed._id,
        },
        { new: true, upsert: true },
      )
    })
  }

  // update the feed post count
  await Feed.updatePostCount(createdFeed._id)

  return Feed.findById(createdFeed._id)
}

/**
 *
 * @param feedUrl
 * @returns {Promise<{meta: {} & Object, posts: *}|null>}
 */
FeedHelper.fetchFeed = async function fetchFeed(feedUrl, feedHostUrl = '') {
  const stream = await FeedHelper.createFeedStream(feedUrl)

  if (!stream) {
    return null
  }

  const { meta, posts } = await FeedHelper.readFeedStream(stream, feedUrl)

  const normalizedPosts = await Promise.map(posts, post => {
    return PostHelper.normalizePost(post)
  })

  meta.identifier = FeedHelper.createFeedIdentifier(feedUrl, normalizedPosts)

  const feedHostMeta = await MetaHelper.getMeta(feedHostUrl.length ? feedHostUrl : meta.url)

  return {
    meta: FeedHelper.mergeMetas(meta, feedHostMeta),
    posts: normalizedPosts.filter(p => p),
  }
}

/**
 * Merge meta collected from the RSS feed with meta
 * collected from the host site HTML.
 * @param {object} rssMeta - meta from FeedParser
 * @param {object} htmlMeta - meta from MetaScraper
 */
FeedHelper.mergeMetas = function mergeMetas(rssMeta, htmlMeta) {
  const merged = Object.assign({}, rssMeta)

  if (!htmlMeta || !Object.keys(htmlMeta).length) {
    return null
  }

  if (!merged.images) merged.images = {}

  merged.canonicalUrl = htmlMeta.canonicalUrl
  merged.publisher = htmlMeta.publisher
  merged.summary = htmlMeta.description
  merged.themeColor = htmlMeta.themeColor
  merged.images.featured = htmlMeta.image
  merged.images.logo = htmlMeta.logo
  merged.images.favicon = htmlMeta.favicon
  merged.publisher = htmlMeta.site_name

  if (htmlMeta.lang && !merged.language) merged.language = htmlMeta.lang

  logger.debug(`merged final meta for page`, merged)

  return merged
}

/**
 * Determine the type of feed from its enclosures
 * @param posts {array} - all of the items from the RSS feed
 * @returns {string} - feed type (article, video, or audio)
 */
FeedHelper.determineFeedType = function determineFeedType(posts) {
  let feedType = 'article'

  posts.forEach(post => {
    if (post.enclosures) {
      post.enclosures.forEach(enclosure => {
        if (!enclosure.type) {
          return false
        }
        if (enclosure.type.indexOf('audio') >= 0) {
          feedType = 'audio'
        } else if (enclosure.type.indexOf('video') >= 0) {
          feedType = 'video'
        }
      })
    }
  })

  return feedType
}

/**
 * Try to create a unique feed identifier. This is most used
 * the first time a feed is added to the system, to see if
 * the feed was already added under a different URL. The feed
 * url is used in the ID as well as the identifiers of the first
 * 5 posts in the feed. Every time the feed updates via the
 * daemon, this identifier is updated too.
 *
 * @param feedUrl {string} - the url of the feed
 * @param posts {array} - an array of processed feed posts. these
 * must be provided after the identifier of each post
 * has been created.
 * @returns {string} - an MD5 has used as an identifier
 */
FeedHelper.createFeedIdentifier = function createFeedIdentifier(feedUrl, posts) {
  // parse the url
  const parsedUrl = url.parse(feedUrl)
  let id = `${parsedUrl.hostname}:${parsedUrl.pathname}`

  // if there are posts, add
  // the identifier of the first
  // 5 posts.
  if (posts && posts.length) {
    posts.slice(0, 5).forEach(post => {
      id += `:${post.identifier}`
    })
  }
  return crypto
    .createHash('md5')
    .update(id)
    .digest('hex')
}

/**
 * Create a read stream for a feed url
 * @param {string} feedUrl - feed url
 * @returns {Promise<null|*>} - processing promise resulting in stream
 */
FeedHelper.createFeedStream = async function createFeedStream(feedUrl) {
  try {
    return got.stream(feedUrl, { retries: 0 })
  } catch (error) {
    logger.error(`Create feed stream failure during feed processing`, {
      error,
      feedUrl,
    })
    return null
  }
}

/**
 * Read a feed's read stream and pull out
 * the relevant meta data and posts
 * @param {object} stream - a read stream (see FeedHelper.createFeedStream)
 * @param {string} feedUrl - feed url
 * @returns {Promise} - processing promise
 */
FeedHelper.readFeedStream = async function readFeedStream(stream, feedUrl) {
  let feedType = ''
  const feed = {
    meta: null,
    posts: [],
  }

  return new Promise((resolve, reject) => {
    stream
      .pipe(new FeedParser())
      .on('error', error => {
        logger.error(`FeedParser error during feed parsing`, {
          error,
          feedUrl,
        })
        return reject(error)
      })
      .on('end', () => {
        feedType = FeedHelper.determineFeedType(feed.posts)
        const results = {}

        results.meta = {
          ...feed.meta,
          feedType,
        }

        results.posts = feed.posts.map(function(post) {
          return {
            ...post,
            postType: feedType,
          }
        })

        return resolve(results)
      })
      .on('readable', function() {
        const streamFeed = this
        feed.meta = {
          url: this.meta.link ? normalizeUrl(this.meta.link) : '',
          language: this.meta.language,
          images: {
            featured: this.meta.image && this.meta.image.url ? this.meta.image.url : '',
            favicon: this.meta.favicon || '',
          },
          description: this.meta.description,
          title: this.meta.title,
          isFeatured: false,
          isPublic: true,
          publishedDate: this.meta.pubDate,
          updatedDate: this.meta.date,
          lastScrapedDate: new Date().toISOString(),
          feedStaleDate: formatISO(addHours(new Date(), 1)),
          copyright: this.meta.copyright || '',
        }
        let item
        while ((item = streamFeed.read())) {
          feed.posts.push(item)
        }
      })
  })
}

module.exports = FeedHelper
