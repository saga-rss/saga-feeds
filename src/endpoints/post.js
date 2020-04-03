const { ApolloError } = require('apollo-server-express')

const PostHelper = require('../helpers/post')

const postById = async (source, { id }, context) => {
  let post = await context.models.post.findById(id)

  if (!post) {
    throw new ApolloError('post not found', 'NOT_FOUND')
  }

  if (post.postNeedsUpdating() && post.url) {
    // get new post meta
    const meta = await PostHelper.getMeta(id)
    if (meta) {
      post = await PostHelper.updateMeta(id, meta)
    }
  }

  return post
}

const postContent = async ({ id, url, content }) => {
  let freshContent = content

  if (url) {
    const forceUpdate = !content || content.length < 0
    if (forceUpdate) {
      const parsed = await PostHelper.getContent(url)
      const updated = await PostHelper.updateContent(id, parsed)
      freshContent = updated.content || ''
    }
  }

  return freshContent
}

const postFeed = async (source, args, context) => {
  let feed = null

  if (source instanceof context.models.post) {
    feed = await context.models.feed.findById(source.feed)
  }

  return feed
}

module.exports = {
  postById,
  postContent,
  postFeed,
}
