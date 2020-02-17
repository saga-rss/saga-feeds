const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseStringQuery = require('mongoose-string-query')
const autopopulate = require('mongoose-autopopulate')
const mongooseDelete = require('mongoose-delete')

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
    enclosures: [MediaSchema],
    favoriteCount: {
      type: Number,
      default: 0,
    },
    feed: {
      type: Schema.Types.ObjectId,
      ref: 'Feed',
      autopopulate: true,
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
    },
    link: {
      type: String,
      trim: true,
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
  },
  {
    collection: 'post',
    timestamp: true,
  },
)

schema.methods.detailView = function detailView() {
  const transformed = {}
  const fields = [
    'postType',
    'title',
    'url',
    'feedUrl',
    'favoriteCount',
    'summary',
    'description',
    'images',
    'content',
    'enclosures',
    'publishedDate',
    'commentUrl',
    'tags',
    'identifier',
    'interests',
    'author',
  ]
  fields.forEach(field => {
    transformed[field] = this[field]
  })
  return transformed
}

schema.statics.updateByIdentifier = async function updateByIdentifier(identifier, post) {
  return self.findOneAndUpdate({ identifier: post.identifier }, post, { new: true, upsert: true })
}

schema.statics.updateFavoriteCount = async function updateFavoriteCount(id, amount) {
  await this.findOneAndUpdate({ _id: id }, { $inc: { favoriteCount: amount } }).exec()
}

schema.plugin(mongooseStringQuery)
schema.plugin(autopopulate)
schema.plugin(mongooseDelete, {
  overrideMethods: true,
  deletedAt: true,
})

schema.index({ rss: 1, publishedDate: -1 })
schema.index({ publishedDate: -1 })

module.exports = mongoose.models.Post || mongoose.model('Post', schema)
