const FeedParser = require('feedparser')
const got = require('got')

const processFeed = async feedUrl => {
  const feedStream = await createFeedStream(feedUrl)
  const posts = await readFeedStream(feedStream, feedUrl)
  const parsedPosts = await parseFeedPost(posts)

  return parsedPosts
}

const createFeedStream = async feedUrl => {
  try {
    const response = await got.stream(feedUrl, { retries: 0 })
    return response
  } catch (err) {
    console.log(err)
  }
}

const readFeedStream = (stream, feedUrl) => {
  const feed = {
    meta: '',
    posts: [],
  }
  return new Promise((resolve, reject) => {
    stream.pipe(new FeedParser())
      .on('error', reject)
      .on('end', () => {
        resolve(feed)
      })
      .on('readable', function () {
        const streamFeed = this
        feed.meta = {
          url: this.meta.link,
          rss_url: this.meta.xmlurl ? this.meta.xmlurl : feedUrl,
          language: this.meta.language,
          image: this.meta.image && this.meta.image.url ? this.meta.image.url : '',
          favicon: this.meta.favicon,
          categories: this.meta.categories.join(','),
          description: this.meta.description,
          title: this.meta.title,
          is_featured: false,
          is_visible: true,
          published_date: this.meta.pubDate,
          updated_date: this.meta.date,
        }
        let item
        while ((item = streamFeed.read())) {
          feed.posts.push(item)
        }
      })
  })
}

const parseFeedPost = (feed) => {
  feed.posts.map((item) => {
    item.favorite = false
    item.read = false
    item.offline = false

    return item
  })
  return feed
}

module.exports = {
  processFeed,
}
