const FeedParser = require('feedparser')
const got = require('got')
const normalize = require('normalize-url')
const sanitizeHtml = require('sanitize-html')
const strip = require('strip')
const entities = require('entities')
const { addHours, formatISO } = require('date-fns')
const crypto = require('crypto')

const logger = require('../middlewares/logger')
  .getLogger()

const processFeed = async feedUrl => {
  const stream = await createFeedStream(feedUrl)
  const feed = await readFeedStream(stream, feedUrl)
  const posts = await postProcessing(feed.posts)

  return { meta: feed.meta, posts }
}

const createFeedStream = async feedUrl => {
  try {
    const response = await got.stream(feedUrl, { retries: 0 })
    return response
  } catch (error) {
    logger.error(`Create feed stream failure during feed processing`, { error, feedUrl })
  }
}

const determineFeedType = posts => {
  let feedType = 'article'
  posts.map(post => {
    if (post.enclosures) {
      post.enclosures.map(enclosure => {
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
    meta: '',
    posts: [],
  }
  return new Promise((resolve, reject) => {
    stream.pipe(new FeedParser())
      .on('error', error => {
        logger.error(`FeedParser error during feed parsing`, { error, feedUrl })
        return reject(error)
      })
      .on('end', () => {
        feed.meta.feedType = determineFeedType(feed.posts)
        return resolve(feed)
      })
      .on('readable', function () {
        const streamFeed = this
        feed.meta = {
          url: this.meta.link,
          feedUrl: this.meta.xmlurl ? this.meta.xmlurl : feedUrl,
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

const createPostIdentifier = (guid, pubDate) => {
  return crypto.createHash('md5')
    .update(`${guid}:${pubDate}`)
    .digest('hex')
}

const postProcessing = async (posts) => {
  if (!posts || !posts.length) return []

  const postType = determineFeedType(posts)

  const articles = posts.map(post => {
    const processed = {
      postType,
      content: sanitizeHtml(post.summary),
      description: strip(entities.decodeHTML(post.description)),
      enclosures: post.enclosures,
      guid: post.guid,
      link: post.link,
      publishedDate: post.pubdate || post.pubDate,
      title: post.title,
      url: normalize(post.link),
      commentUrl: post.comments,
      images: {
        featured: post.image.url || '',
      },
      identifier: createPostIdentifier(post.guid, post.pubDate),
      media: {
        image: [],
        video: [],
        document: [],
        audio: [],
        executable: [],
      },
    }

    if (post.categories) {
      processed.interests = post.categories
    }

    if (post['media:content']) {
      const content = post['media:content']
      processed.media = processMedia(content, processed.media)
    }

    if (post['media:group']) {
      if (post['media:group']['media:content']) {
        post['media:group']['media:content'].map(content => {
          processed.media = processMedia(content, processed.media)
        })
      }
    }

    return processed
  })

  return articles
}

const processMedia = (content, media) => {
  const mainContent = content['@']

  let type = mainContent.medium

  if (!type && mainContent.type) {
    if (mainContent.type.indexOf('audio') >= 0) {
      type = 'audio'
    } else if (mainContent.type.indexOf('video') >= 0) {
      type = 'video'
    }
  }

  const contentTitle = content['media:title'] ? content['media:title']['#'] : ''
  const contentDescription = content['media:description'] ? content['media:description']['#'] : ''

  switch (type) {
    case 'image':
      media.image.push({
        url: mainContent.url,
        type: mainContent.type || '',
        fileSize: mainContent.filesize || '',
        width: mainContent.width || '',
        height: mainContent.height || '',
        title: contentTitle,
        description: contentDescription,
      })
      break
    case 'video':
      media.video.push({
        url: mainContent.url,
        type: mainContent.type || '',
        fileSize: mainContent.filesize || '',
        width: mainContent.width || '',
        height: mainContent.height || '',
        title: contentTitle,
        description: contentDescription,
      })
      break
    case 'document':
      media.document.push({
        url: mainContent.url,
        type: mainContent.type || '',
        fileSize: mainContent.filesize || '',
        title: contentTitle,
        description: contentDescription,
      })
      break
    case 'audio':
      media.audio.push({
        url: mainContent.url,
        type: mainContent.type || '',
        fileSize: mainContent.filesize || '',
        title: contentTitle,
        description: contentDescription,
      })
      break
    case 'executable':
      media.executable.push({
        url: mainContent.url,
        type: mainContent.type || '',
        fileSize: mainContent.filesize || '',
        title: contentTitle,
        description: contentDescription,
      })
      break
    default:
      logger.info(`media content found but was not processed`, mainContent)
      break
  }

  return media
}

module.exports = {
  processFeed,
}
