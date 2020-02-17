import mongoose, { Schema } from 'mongoose'
import mongooseStringQuery from 'mongoose-string-query'
import autopopulate from 'mongoose-autopopulate'

const schema = new Schema(
  {
    feed: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Feed',
        required: true,
        autopopulate: true,
      },
    ],
    name: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    collection: 'folder',
    timestamp: true,
  },
)

schema.plugin(mongooseStringQuery)
schema.plugin(autopopulate)

module.exports = mongoose.model('Folder', schema)
