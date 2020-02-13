const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseStringQuery = require('mongoose-string-query')
const normalizeUrl = require('normalize-url')
const entities = require('entities')
const { subSeconds, isAfter } = require('date-fns')
const Promise = require('bluebird')

const schema = new Schema(
  {
    feedType: {
      type: String,
      enum: ['article', 'audio', 'video'],
      default: 'article',
    },
    url: {
      type: String,
      trim: true,
      index: true,
    },
    canonicalUrl: {
      type: String,
      trim: true,
    },
    feedUrl: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      required: true,
    },
    feedUrls: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    images: {
      featured: {
        type: String,
        trim: true,
        default: '',
      },
      openGraph: {
        type: String,
        trim: true,
        default: '',
      },
      favicon: {
        type: String,
        trim: true,
        default: '',
      },
    },
    public: {
      type: Boolean,
      default: true,
    },
    publishedDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
    valid: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastScrapedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    followerCount: {
      type: Number,
      default: 0,
    },
    postCount: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    interests: {
      type: [String],
      index: true,
    },
    language: {
      type: String,
      default: '',
    },
    scrapeFailureCount: {
      type: Number,
      default: 0,
    },
    feedStaleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'feed',
    timestamp: true,
  },
)

schema.methods.detailView = function detailView() {
  const transformed = {
    id: this._id,
  }
  const fields = [
    'feedType',
    'title',
    'url',
    'feedUrl',
    'followerCount',
    'likesCount',
    'summary',
    'language',
    'images',
    'isFeatured',
    'description',
    'publishedDate',
    'isVisible',
    'createdAt',
    'updatedAt',
    'updatedDate',
    'feedStaleDate',
    'scrapeFailureCount',
    'interests',
  ]
  fields.forEach(field => {
    transformed[field] = this[field]
  })
  return transformed
}

schema.statics.addScrapeFailure = async function(id) {
  await this.findOneAndUpdate({ _id: id }, { $inc: { scrapeFailureCount: 1 } }).exec()
}

schema.statics.createOrUpdateFeed = async function createOrUpdateFeed(discovery) {
  const self = this

  const newFeeds = []
  const rssFeeds = []

  await Promise.map(discovery.feedUrls, async f => {
    const feedUrl = normalizeUrl(f.url)

    // attempt to find a matching feed in the db
    let rss = await self.findOne({ feedUrl })

    if (!rss || isAfter(new Date(rss.lastScrapedDate), subSeconds(new Date(), 30))) {
      const feedTitle = rss ? rss.title : f.title || discovery.site.title

      const response = await self.findOneAndUpdate(
        { feedUrl },
        {
          description: entities.decodeHTML(feedTitle),
          feedUrl: feedUrl,
          images: {
            favicon: discovery.site.favicon || '',
          },
          lastScrapedDate: new Date().toISOString(),
          title: entities.decodeHTML(feedTitle),
          url: discovery.site.url,
          valid: true,
        },
        {
          new: true,
          rawResult: true,
          upsert: true,
        },
      )

      rss = response.value
      if (response.lastErrorObject.upserted) {
        newFeeds.push(rss)
      }

      rss.save()
    }

    return rssFeeds.push(rss)
  })

  return {
    feeds: rssFeeds.map(f => f.detailView()),
    newFeeds,
  }
}

schema.plugin(mongooseStringQuery)

module.exports = mongoose.model('Feed', schema)
