const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseStringQuery = require('mongoose-string-query')
const mongooseAutopopulate = require('mongoose-autopopulate')
const mongooseDelete = require('mongoose-delete')
const mongooseTimestamp = require('mongoose-timestamp')
const { formatISO, addHours, subHours, subSeconds, isAfter } = require('date-fns')

const MediaSchema = new Schema({
  url: {
    type: String,
    trim: true,
    required: true,
  },
  type: {
    type: String,
    trim: true,
    default: '',
  },
  length: {
    type: String,
    trim: true,
    default: '',
  },
  width: {
    type: String,
    trim: true,
    default: '',
  },
  height: {
    type: String,
    trim: true,
    default: '',
  },
  title: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  medium: {
    type: String,
    trim: true,
    default: '',
  },
})

const schema = new Schema(
  {
    author: {
      type: String,
      trim: true,
      index: true,
    },
    canonicalUrl: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    commentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    direction: {
      type: String,
      trim: true,
    },
    enclosures: [MediaSchema],
    favoriteCount: {
      type: Number,
      default: 0,
    },
    feed: {
      type: Schema.Types.ObjectId,
      ref: 'Feed',
      autopopulate: {
        select: ['_id', 'images', 'title', 'publisher', 'copyright'],
      },
      required: true,
      index: true,
    },
    guid: {
      type: String,
      trim: true,
    },
    images: {
      featured: {
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
    identifier: {
      type: String,
      trim: true,
      index: true,
    },
    interests: {
      type: [String],
      index: true,
      default: [],
    },
    postStaleDate: {
      type: Date,
    },
    postType: {
      type: String,
      enum: ['article', 'audio', 'video'],
      default: 'article',
    },
    publishedDate: {
      type: Date,
      default: Date.now,
    },
    summary: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    url: {
      type: String,
      trim: true,
      required: true,
      index: { type: 'hashed' },
    },
    wordCount: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'post',
  },
)

schema.methods.detailView = function detailView() {
  const transformed = {}
  const fields = [
    'postType',
    'title',
    'url',
    'favoriteCount',
    'summary',
    'description',
    'images',
    'content',
    'enclosures',
    'publishedDate',
    'commentUrl',
    'identifier',
    'interests',
    'author',
    'wordCount',
    'direction',
    'feed',
    'postStaleDate',
  ]
  fields.forEach(field => {
    transformed[field] = this[field]
  })
  return transformed
}

schema.methods.postNeedsUpdating = function postNeedsUpdating() {
  if (!this.postStaleDate) return true

  const postModifiedLimit = subHours(new Date(), 24)

  // the post is stale if it is older than 24 hours
  const isPostStale = isAfter(postModifiedLimit, this.postStaleDate)

  return isPostStale
}

schema.statics.setStaleDate = async function setStaleDate(id) {
  return this.findOneAndUpdate({ _id: id }, { postStaleDate: formatISO(addHours(new Date(), 24)) }, { new: true })
}

schema.statics.updateByIdentifier = async function updateByIdentifier(identifier, post) {
  return this.findOneAndUpdate({ identifier: post.identifier }, post, {
    new: true,
    upsert: true,
  })
}

schema.statics.updateFavoriteCount = async function updateFavoriteCount(id, amount) {
  await this.findOneAndUpdate({ _id: id }, { $inc: { favoriteCount: amount } }, { new: true })
}

schema.plugin(mongooseStringQuery)
schema.plugin(mongooseAutopopulate)
schema.plugin(mongooseDelete, {
  overrideMethods: true,
  deletedAt: true,
})
schema.plugin(mongooseTimestamp)

schema.index({ rss: 1, publishedDate: -1 })
schema.index({ publishedDate: -1 })

module.exports = mongoose.models.Post || mongoose.model('Post', schema)
