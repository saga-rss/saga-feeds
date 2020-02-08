const Queue = require('bull')

const types = require('../types')
const feedEndProcess = require('../processors/feedEndProcess')
const PROCESS_LIMIT = 20

const FeedEndQueue = new Queue(types.RSS_NEW_FEED_END)
const FeedEndQueueAdd = FeedEndQueue.add.bind(FeedEndQueue)
const FeedEndQueueProcess = () => FeedEndQueue.process(PROCESS_LIMIT, feedEndProcess)
const FeedEndQueueStop = () => FeedEndQueue.close()

module.exports = {
  FeedEndQueue,
  FeedEndQueueAdd,
  FeedEndQueueProcess,
  FeedEndQueueStop,
}
