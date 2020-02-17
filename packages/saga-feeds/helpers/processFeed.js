const FeedParser = require('feedparser')
const normalizeUrl = require('normalize-url')
const { addHours, formatISO } = require('date-fns')
const Promise = require('bluebird')

const got = require('../helpers/got')
const logger = require('./logger').getLogger()
const { processPost } = require('./processPost')

const processFeed = async (feedUrl, shouldUpdate) => {
  if (!shouldUpdate) return false

  const stream = await createFeedStream(feedUrl)
  const feed = await readFeedStream(stream, feedUrl)

  const processedPosts = Promise.map(feed.posts, post => {
    return processPost(post, false)
  })

  return { meta: feed.meta, posts: processedPosts }
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
  }
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
        const feedType = determineFeedType(feed.posts)
        feed.meta.feedType = feedType
        feed.posts = feed.posts.map(post => (post.postType = feedType))
        return resolve(feed)
      })
      .on('readable', function() {
        const streamFeed = this
        feed.meta = {
          url: normalizeUrl(this.meta.link),
          language: this.meta.language,
          image: {
            featured: this.meta.image && this.meta.image.url ? this.meta.image.url : '',
            favicon: this.meta.favicon || '',
          },
          interests: this.meta.categories,
          description: this.meta.description,
          title: this.meta.title,
          isFeatured: false,
          isVisible: true,
          publishedDate: this.meta.pubDate,
          updatedDate: this.meta.date,
          lastScrapedDate: new Date().toISOString(),
          feedStaleDate: formatISO(addHours(new Date(), 1)),
        }
        let item
        while ((item = streamFeed.read())) {
          feed.posts.push(item)
        }
      })
  })
}

module.exports = { processFeed }
