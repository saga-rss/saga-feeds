const { subSeconds, isAfter } = require('date-fns')

const shouldFeedPostsUpdate = (feedStaleDate, feedHeaders) => {
  const thirtySecondsAgo = subSeconds(new Date(), 30)

  const feedStale = isAfter(
    new Date(feedStaleDate),
    thirtySecondsAgo,
  )

  const lastModifiedDate = feedHeaders['last-modified'] || new Date()
  const feedModified = isAfter(
    new Date(lastModifiedDate),
    thirtySecondsAgo,
  )

  return feedStale || feedModified
}

module.exports = {
  shouldFeedPostsUpdate,
}
