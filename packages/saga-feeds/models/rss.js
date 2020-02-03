const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseStringQuery = require('mongoose-string-query')

const schema = new Schema({
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
  fingerprint: {
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
  categories: {
    type: String,
    trim: true,
    default: '',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  images: {
    featured: {
      type: String,
      trim: true,
      default: '',
    },
    banner: {
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
  publicationDate: {
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
  likes: {
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
  interest: {
    type: String,
    default: '',
    index: true,
  },
  language: {
    type: String,
    default: '',
  },
}, {
  collection: 'rss',
  timestamp: true,
})

schema.method('detailView', () => {
  const transformed = {}
  const fields = ['title', 'url', 'feedUrl', 'followerCount', 'likes', 'summary', 'language', 'images', 'isFeatured',
    'description', 'categories', 'publicationDate']
  fields.forEach((field) => {
    transformed[field] = this[field]
  })
  return transformed
})

schema.plugin(mongooseStringQuery)

module.exports = mongoose.model('RSS', schema)
