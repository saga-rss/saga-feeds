const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseTimestamp = require('mongoose-timestamp')
const mongooseMPath = require('mongoose-mpath')
const Promise = require('bluebird')
const mongooseSlug = require('mongoose-slug-updater')

const schema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      slug: 'name',
      unique: true,
    },
  },
  {
    collection: 'interest',
  },
)

schema.statics.createInterest = async function createInterest(name, parent = null) {
  let created = await this.create({ name })

  if (parent) {
    created.parent = await this.findOne({ _id: parent })
    await created.save()
    created = this.findOne({ _id: created._id })
  }

  return created
}

schema.statics.getAllInterests = async function getAllInterests(interests = []) {
  interests = interests.length ? interests : await this.find({ parent: null })

  const mapped = []

  await Promise.mapSeries(interests, async interest => {
    const children = await interest.getChildrenTree({})

    return mapped.push({
      id: interest._id,
      name: interest.name,
      slug: interest.slug,
      children: children.map(child => ({
        id: child._id,
        name: child.name,
        slug: child.slug,
      })),
    })
  })

  return mapped
}

schema.plugin(mongooseMPath)
schema.plugin(mongooseTimestamp)
schema.plugin(mongooseSlug)

module.exports = mongoose.models.Interest || mongoose.model('Interest', schema)
