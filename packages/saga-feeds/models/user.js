const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseBcrypt = require('mongoose-bcrypt')
const mongooseStringQuery = require('mongoose-string-query')
const mongooseDelete = require('mongoose-delete')
const mongooseTimestamp = require('mongoose-timestamp')
const jwt = require('jsonwebtoken')

const config = require('../config')

const schema = new Schema(
  {
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    displayName: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
      required: true,
    },
    interests: {
      type: [String],
      index: true,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    normalizedEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
      bcrypt: true,
    },
    username: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
      required: true,
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    collection: 'user',
  },
)

schema.plugin(mongooseBcrypt)
schema.plugin(mongooseStringQuery)
schema.plugin(mongooseDelete, {
  overrideMethods: true,
  deletedAt: true,
})
schema.plugin(mongooseTimestamp)

schema.index({ email: 1, username: 1 })

schema.methods.getToken = function getToken() {
  return jwt.sign(
    {
      sub: this._id,
      email: this.email,
      isAdmin: this.isAdmin,
    },
    config.jwt.secret,
    {
      issuer: config.jwt.issuer,
      expiresIn: '1h',
    },
  )
}

schema.methods.detailView = function detailView() {
  const transformed = {}
  const fields = ['_id', 'bio', 'displayName', 'email', 'interests', 'isActive', 'isAdmin', 'username', 'url']
  fields.forEach(field => {
    transformed[field] = this[field]
  })
  return transformed
}

module.exports = mongoose.models.User || mongoose.model('User', schema)
