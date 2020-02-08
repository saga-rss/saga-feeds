const Queue = require('bull')

const types = require('../types')
const feedStartProcess = require('../processors/feedStartProcess')
const PROCESS_LIMIT = 20

const FeedStartQueue = new Queue(types.RSS_NEW_FEED_START)
const FeedStartQueueAdd = FeedStartQueue.add.bind(FeedStartQueue)
const FeedStartQueueProcess = () => FeedStartQueue.process(PROCESS_LIMIT, feedStartProcess)
const FeedStartQueueStop = () => FeedStartQueue.close()

module.exports = {
  FeedStartQueue,
  FeedStartQueueAdd,
  FeedStartQueueProcess,
  FeedStartQueueStop,
}
