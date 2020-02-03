import mongoose, { Schema } from 'mongoose'
import mongooseStringQuery from 'mongoose-string-query'
import autopopulate from 'mongoose-autopopulate'

const schema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  rss: [
    {
      type: Schema.Types.ObjectId,
      ref: 'RSS',
      required: true,
      autopopulate: true,
    },
  ],
}, {
  collection: 'folders',
  timestamp: true,
})

schema.plugin(mongooseStringQuery)
schema.plugin(autopopulate)

module.exports = mongoose.model('Folder', schema)
