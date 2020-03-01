const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongooseStringQuery = require("mongoose-string-query");
const mongooseAutopopulate = require("mongoose-autopopulate");
const mongooseTimestamp = require("mongoose-timestamp");

const schema = new Schema(
  {
    color: {
      type: String,
      trim: true
    },
    feed: [
      {
        type: Schema.Types.ObjectId,
        ref: "Feed",
        required: true,
        autopopulate: true
      }
    ],
    name: {
      type: String,
      trim: true,
      required: true
    }
  },
  {
    collection: "folder"
  }
);

schema.plugin(mongooseStringQuery);
schema.plugin(mongooseAutopopulate);
schema.plugin(mongooseTimestamp);

module.exports = mongoose.models.Folder || mongoose.model("Folder", schema);
