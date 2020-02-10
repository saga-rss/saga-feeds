const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseStringQuery = require('mongoose-string-query')
const autopopulate = require('mongoose-autopopulate')

const MediaSchema = new Schema({
  url: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    trim: true,
  },
  fileSize: {
    type: String,
    trim: true,
  },
  length: {
    type: String,
    trim: true,
  },
  width: {
    type: String,
    trim: true,
  },
  height: {
    type: String,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
})

const schema = new Schema({
  feed: {
    type: Schema.Types.ObjectId,
    ref: 'Feed',
    autopopulate: true,
    required: true,
    index: true,
  },
  postType: {
    type: String,
    enum: ['article', 'audio', 'video'],
    default: 'article',
  },
  url: {
    type: String,
    trim: true,
    required: true,
    index: { type: 'hashed' },
  },
  canonicalUrl: {
    type: String,
    trim: true,
  },
  guid: {
    type: String,
    trim: true,
  },
  link: {
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
    maxLength: 240,
    default: '',
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
  images: {
    featured: {
      type: String,
      trim: true,
      default: '',
    },
    favicon: {
      type: String,
      trim: true,
      default: '',
    },
    openGraph: {
      type: String,
      trim: true,
      default: '',
    },
  },
  publishedDate: {
    type: Date,
    default: Date.now,
  },
  enclosures: [MediaSchema],
  likeCount: {
    type: Number,
    default: 0,
  },
  media: {
    image: [MediaSchema],
    audio: [MediaSchema],
    video: [MediaSchema],
    document: [MediaSchema],
    executable: [MediaSchema],
  },
  interests: {
    type: [String],
    index: true,
  },
  identifier: {
    type: String,
    trim: true,
    index: true,
  },
}, {
  collection: 'post',
  timestamp: true,
})

schema.methods.detailView = function detailView() {
  const transformed = {}
  const fields = ['postType', 'title', 'url', 'feedUrl', 'likeCount', 'description', 'images',
    'content', 'enclosures', 'publishedDate', 'commentUrl', 'media', 'tags', 'identifier', 'interests']
  fields.forEach((field) => {
    transformed[field] = this[field]
  })
  return transformed
}

schema.plugin(mongooseStringQuery)
schema.plugin(autopopulate)

schema.index({ rss: 1, publishedDate: -1 })
schema.index({ publishedDate: -1 })

module.exports = mongoose.model('Post', schema)
