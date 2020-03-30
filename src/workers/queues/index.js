const { FeedStartQueue, FeedStartQueueAdd, FeedStartQueueProcess, FeedStartQueueStop } = require('./feedStartQueue')
const { FeedEndQueue, FeedEndQueueAdd, FeedEndQueueProcess, FeedEndQueueStop } = require('./feedEndQueue')
const { MetaEndQueue, MetaEndQueueAdd, MetaEndQueueProcess, MetaEndQueueStop } = require('./metaEndQueue')
const { MetaStartQueue, MetaStartQueueAdd, MetaStartQueueProcess, MetaStartQueueStop } = require('./metaStartQueue')
const { PostStartQueue, PostStartQueueAdd, PostStartQueueProcess, PostStartQueueStop } = require('./postStart.queue')

module.exports = {
  FeedEndQueue,
  FeedEndQueueAdd,
  FeedEndQueueProcess,
  FeedEndQueueStop,

  FeedStartQueue,
  FeedStartQueueAdd,
  FeedStartQueueProcess,
  FeedStartQueueStop,

  MetaEndQueue,
  MetaEndQueueAdd,
  MetaEndQueueProcess,
  MetaEndQueueStop,

  MetaStartQueue,
  MetaStartQueueAdd,
  MetaStartQueueProcess,
  MetaStartQueueStop,

  PostStartQueue,
  PostStartQueueAdd,
  PostStartQueueProcess,
  PostStartQueueStop,
}
