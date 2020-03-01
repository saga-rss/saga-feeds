const Queue = require("bull");

const processor = require("../processors/feedEndProcess");
const PROCESS_LIMIT = 20;
const RSS_NEW_FEED_END = "rss/NEW_FEED_END";

const FeedEndQueue = new Queue(RSS_NEW_FEED_END);
const FeedEndQueueAdd = FeedEndQueue.add.bind(FeedEndQueue);
const FeedEndQueueProcess = () =>
  FeedEndQueue.process(PROCESS_LIMIT, processor);
const FeedEndQueueStop = () => FeedEndQueue.close();

module.exports = {
  RSS_NEW_FEED_END,
  FeedEndQueue,
  FeedEndQueueAdd,
  FeedEndQueueProcess,
  FeedEndQueueStop
};
