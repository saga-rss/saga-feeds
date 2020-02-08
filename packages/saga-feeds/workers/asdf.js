const Queue = require('bull')

const types = require('./types')
const processors = require('./processors')
const PROCESS_LIMIT = 20

const FeedStartQueue = new Queue(types.RSS_NEW_FEED_START)
const FeedStartQueueAdd = FeedStartQueue.add.bind(FeedStartQueue)
const FeedStartQueueProcess = () => FeedStartQueue.process(PROCESS_LIMIT, processors.feedStartProcess)
const FeedStartQueueStop = () => FeedStartQueue.close()

const FeedEndQueue = new Queue(types.RSS_NEW_FEED_END)
const FeedEndQueueAdd = FeedEndQueue.add.bind(FeedEndQueue)
const FeedEndQueueProcess = () => FeedEndQueue.process(PROCESS_LIMIT, processors.feedEndProcess)
const FeedEndQueueStop = () => FeedEndQueue.close()

module.exports = {
  FeedEndQueue,
  FeedEndQueueAdd,
  FeedEndQueueProcess,
  FeedEndQueueStop,

  FeedStartQueue,
  FeedStartQueueAdd,
  FeedStartQueueProcess,
  FeedStartQueueStop,
}
