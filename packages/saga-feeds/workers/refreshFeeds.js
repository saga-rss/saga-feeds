const got = require("got");

const Feed = require("../models/feed");
const { FeedStartQueueAdd } = require("../workers/queues");
const { shouldFeedPostsUpdate } = require("../util/rss");
const logger = require("../helpers/logger").getLogger();

const refreshFeeds = async (forceUpdate = false) => {
  return Feed.find()
    .sort({ lastScrapedDate: "asc" })
    .cursor()
    .eachAsync(async doc => {
      if (!doc.feedUrl) return Promise.resolve();

      try {
        const freshFeed = await got.get(doc.feedUrl);

        const willUpdate = shouldFeedPostsUpdate(
          doc.feedStaleDate,
          freshFeed.headers
        );

        if (forceUpdate || willUpdate) {
          await FeedStartQueueAdd(
            {
              type: "Feed",
              rssId: doc._id,
              url: doc.feedUrl
            },
            { removeOnComplete: true, removeOnFail: true }
          );
        }

        return Promise.resolve(doc);
      } catch (error) {
        logger.error(`Problem updating feed`, { error, doc });
        await Feed.addScrapeFailure(doc._id);

        if (error.response && error.response.statusCode === 404) {
          // this feed doesn't exist
          await doc.remove();
        }

        return cursor.next();
      }
    })
    .catch(error => {
      logger.error(`Problem updating feed`, { error });
    });
};

module.exports = {
  refreshFeeds
};
