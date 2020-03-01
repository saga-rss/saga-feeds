const {
  FeedStartQueue,
  FeedStartQueueAdd,
  FeedStartQueueProcess,
  FeedStartQueueStop
} = require("./feedStartQueue");
const {
  FeedEndQueue,
  FeedEndQueueAdd,
  FeedEndQueueProcess,
  FeedEndQueueStop
} = require("./feedEndQueue");
const {
  MetaEndQueue,
  MetaEndQueueAdd,
  MetaEndQueueProcess,
  MetaEndQueueStop
} = require("./metaEndQueue");
const {
  MetaStartQueue,
  MetaStartQueueAdd,
  MetaStartQueueProcess,
  MetaStartQueueStop
} = require("./metaStartQueue");

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
  MetaStartQueueStop
};
