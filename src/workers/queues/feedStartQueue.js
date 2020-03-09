const Queue = require('bull')

const { bullOptions } = require('../../services/redis')
const processor = require('../processors/feedStartProcess')
const PROCESS_LIMIT = 20
const RSS_NEW_FEED_START = 'rss/NEW_FEED_START'

const FeedStartQueue = new Queue(RSS_NEW_FEED_START, bullOptions)
const FeedStartQueueAdd = FeedStartQueue.add.bind(FeedStartQueue)
const FeedStartQueueProcess = () => FeedStartQueue.process(PROCESS_LIMIT, processor)
const FeedStartQueueStop = () => FeedStartQueue.close()

module.exports = {
  RSS_NEW_FEED_START,
  FeedStartQueue,
  FeedStartQueueAdd,
  FeedStartQueueProcess,
  FeedStartQueueStop,
}
