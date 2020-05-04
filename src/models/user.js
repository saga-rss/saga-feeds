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
    interests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Interest',
        index: true,
      },
    ],
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
      expiresIn: config.jwt.expiresIn,
    },
  )
}

schema.methods.getInterests = async function getInterests() {
  if (!this.interests || !this.interests.length) return []

  const userInterests = await mongoose.models.Interest.find({
    _id: { $in: this.interests },
  })

  const parents = userInterests.map(i => {
    if (i.level === 1) return i
  })

  return mongoose.models.Interest.getAllInterests(parents)
}

module.exports = mongoose.models.User || mongoose.model('User', schema)
