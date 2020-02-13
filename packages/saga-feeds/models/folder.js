import mongoose, { Schema } from 'mongoose'
import mongooseStringQuery from 'mongoose-string-query'
import autopopulate from 'mongoose-autopopulate'

const schema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    feed: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Feed',
        required: true,
        autopopulate: true,
      },
    ],
  },
  {
    collection: 'folder',
    timestamp: true,
  },
)

schema.plugin(mongooseStringQuery)
schema.plugin(autopopulate)

module.exports = mongoose.model('Folder', schema)
