const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongooseAutopopulate = require('mongoose-autopopulate')
const mongooseTimestamp = require('mongoose-timestamp')

const schema = new Schema(
  {
    feed: {
      type: Schema.Types.ObjectId,
      ref: 'Feed',
      required: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    collection: 'subscription',
  },
)

schema.statics.unsubscribe = async function unsubscribe(feedId, userId) {
  const sub = await this.findOne({ owner: userId, feed: feedId })

  if (sub) {
    await sub.remove()
  }

  const subscriptionCount = await this.count({ feed: feedId })
  await mongoose.models.Feed.update({ _id: feedId }, { subscriptionCount })

  const feed = await mongoose.models.Feed.findOne(feedId)

  return feed
}

schema.statics.subscribe = async function subscribe(feedId, userId, isFavorite = false) {
  let sub = await this.findOne({ owner: userId, feed: feedId })
  if (!sub) {
    sub = await this.create({ owner: userId, feed: feedId, isFavorite })
  }

  const subscriptionCount = await this.count({ feed: feedId })
  await mongoose.models.Feed.update({ _id: feedId }, { subscriptionCount })

  return sub
}

schema.plugin(mongooseAutopopulate)
schema.plugin(mongooseTimestamp)

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', schema)
