const Queue = require('bull')

const types = require('../types')
const processor = require('../processors/feedStartProcess')
const PROCESS_LIMIT = 20

const FeedStartQueue = new Queue(types.RSS_NEW_FEED_START)
const FeedStartQueueAdd = FeedStartQueue.add.bind(FeedStartQueue)
const FeedStartQueueProcess = () => FeedStartQueue.process(PROCESS_LIMIT, processor)
const FeedStartQueueStop = () => FeedStartQueue.close()

module.exports = {
  FeedStartQueue,
  FeedStartQueueAdd,
  FeedStartQueueProcess,
  FeedStartQueueStop,
}
