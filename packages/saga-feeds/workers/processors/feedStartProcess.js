const mongoose = require("mongoose");

const { FeedEndQueueAdd } = require("../queues/feedEndQueue");
const { processFeed } = require("../../helpers/rss");
const logger = require("../../helpers/logger").getLogger();

module.exports = async (job, done) => {
  const { data } = job;

  if (data.type !== "Feed") {
    logger.warn("Received a non-rss job in the feed queue processor", data);
    return done();
  }

  if (!data.rssId || !mongoose.Types.ObjectId.isValid(data.rssId)) {
    logger.warn("Received an invalid rss ID in the feed queue processor", data);
    return done();
  }

  logger.debug("Starting a new rss job", {
    queue: job.queue.name,
    data
  });

  try {
    const results = await processFeed(data.url);

    await FeedEndQueueAdd({
      type: "Feed",
      rssId: data.rssId,
      url: data.feedUrl,
      results
    });

    return done(null, results);
  } catch (error) {
    logger.error("Failed when processing rss job", {
      data,
      error,
      queue: job.queue.name
    });

    return done(error);
  }
};
