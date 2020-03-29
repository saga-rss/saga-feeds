const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseStringQuery = require('mongoose-string-query')
const mongooseDelete = require('mongoose-delete')
const mongooseTimestamp = require('mongoose-timestamp')
const normalizeUrl = require('normalize-url')
const entities = require('entities')
const { formatISO, addHours, subSeconds, isAfter } = require('date-fns')
const Promise = require('bluebird')

const schema = new Schema(
  {
    canonicalUrl: {
      type: String,
      trim: true,
    },
    copyright: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    favoriteCount: {
      type: Number,
      default: 0,
    },
    feedStaleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    feedType: {
      type: String,
      enum: ['article', 'audio', 'video'],
      default: 'article',
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
    identifier: {
      type: String,
      trim: true,
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
      logo: {
        type: String,
        trim: true,
        default: '',
      },
    },
    interests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Interest',
        autopopulate: {
          select: ['_id', 'slug', 'name'],
        },
        required: true,
        index: true,
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublic: {
      // is the post publicly available on the internet
      type: Boolean,
      default: true,
      index: true,
    },
    language: {
      type: String,
      default: '',
    },
    lastScrapedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metaStaleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    postCount: {
      type: Number,
      default: 0,
    },
    publishedDate: {
      type: Date,
      default: Date.now,
    },
    publisher: {
      type: String,
      default: '',
    },
    scrapeFailureCount: {
      type: Number,
      default: 0,
    },
    subscriptionCount: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
    url: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    collection: 'feed',
  },
)

schema.methods.feedNeedsUpdating = function feedNeedsUpdating(feedHeaders) {
  if (!this.feedStaleDate) return true

  const thirtySecondsAgo = subSeconds(new Date(), 30)

  const lastModifiedDate =
    feedHeaders['last-modified'] && isAfter(new Date(feedHeaders['last-modified']), new Date(this.feedStaleDate))
      ? new Date(feedHeaders['last-modified'])
      : new Date(this.feedStaleDate)

  const isFeedStale = isAfter(thirtySecondsAgo, lastModifiedDate)

  return isFeedStale
}

schema.statics.setPublic = async function setPublic(id, isPublic) {
  await this.findOneAndUpdate({ _id: id }, { isPublic }).exec()
}

schema.statics.addScrapeFailure = async function addScrapeFailure(id) {
  await this.findOneAndUpdate({ _id: id }, { $inc: { scrapeFailureCount: 1 } }).exec()
}

schema.statics.updateFollowerCount = async function updateFollowerCount(id, amount) {
  await this.findOneAndUpdate({ _id: id }, { $inc: { followerCount: amount } }).exec()
}

schema.statics.updateFavoriteCount = async function updateFavoriteCount(id, amount) {
  await this.findOneAndUpdate({ _id: id }, { $inc: { favoriteCount: amount } }).exec()
}

schema.statics.updatePostCount = async function updatePostCount(id) {
  const postCount = await this.model('Post')
    .find({ feed: id })
    .count()

  await this.findOneAndUpdate({ _id: id }, { $set: { postCount: postCount } }).exec()
}

schema.statics.updateFeedMeta = async function updateFeedMeta(feedId, meta) {
  const updatedFeed = await this.findOneAndUpdate(
    { _id: feedId },
    {
      summary: meta.description,
      images: {
        logo: meta.logo,
        openGraph: meta.image,
      },
      publisher: meta.publisher,
      metaStaleDate: formatISO(addHours(new Date(), 1)),
    },
    {
      new: true,
    },
  )

  return updatedFeed
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
          url: normalizeUrl(discovery.site.url),
          isValid: true,
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
schema.plugin(mongooseDelete, {
  overrideMethods: true,
  deletedAt: true,
})
schema.plugin(mongooseTimestamp)

module.exports = mongoose.models.Feed || mongoose.model('Feed', schema)
