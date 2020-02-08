const { subSeconds, isAfter } = require('date-fns')

const shouldFeedPostsUpdate = (lastScrapedDate, feedHeaders) => {
  const thirtySecondsAgo = subSeconds(new Date(), 30)

  const lastScrapedDateCondition = isAfter(
    new Date(lastScrapedDate),
    thirtySecondsAgo,
  )

  const lastModifiedDate = feedHeaders['last-modified'] || new Date()
  const conditionFeedExpiration = isAfter(
    new Date(lastModifiedDate),
    thirtySecondsAgo,
  )

  return lastScrapedDateCondition && conditionFeedExpiration
}

module.exports = {
  shouldFeedPostsUpdate,
}
