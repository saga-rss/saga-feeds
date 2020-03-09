const FeedParser = require('feedparser')
const normalizeUrl = require('normalize-url')
const { addHours, formatISO } = require('date-fns')
const Promise = require('bluebird')
const url = require('url')
const crypto = require('crypto')

const got = require('./got')
const logger = require('./logger').getLogger()
const { processPost } = require('./processPost')

const processFeed = async (feedUrl, shouldUpdate) => {
  if (!shouldUpdate) return false

  const stream = await createFeedStream(feedUrl)

  if (!stream) {
    return null
  }

  const { meta, posts } = await readFeedStream(stream, feedUrl)

  const processedPosts = await Promise.map(posts, post => {
    return processPost(post, shouldUpdate)
  })

  meta.identifier = createFeedIdentifier(feedUrl, processedPosts)

  return { meta, posts: processedPosts }
}

const createFeedStream = async feedUrl => {
  try {
    const response = await got.stream(feedUrl, { retries: 0 })
    return response
  } catch (error) {
    logger.error(`Create feed stream failure during feed processing`, {
      error,
      feedUrl,
    })
    return null
  }
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
const createFeedIdentifier = (feedUrl, posts) => {
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

const determineFeedType = posts => {
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

const readFeedStream = (stream, feedUrl) => {
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
        feedType = determineFeedType(feed.posts)
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
          image: {
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

module.exports = { processFeed }
