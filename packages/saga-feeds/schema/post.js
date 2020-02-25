const { ApolloError } = require('apollo-server-express')

const { updatePostContent, updatePostMeta } = require('../helpers/processPost')

const postById = async (source, { id }, context) => {
  let post = await context.models.post.findById(id)

  if (!post) {
    throw new ApolloError('post not found', 'NOT_FOUND')
  }

  return post
}

const postContent = async ({ id, url, content }, args, context) => {
  let freshContent = content

  if (url) {
    const forceUpdate = !content || content.length < 0
    await updatePostContent(id, url, forceUpdate)
    await updatePostMeta(id, url, forceUpdate)
    await context.models.post.setStaleDate(id)
    const updatedPost = await context.models.post.findById(id)

    freshContent = updatedPost.content
  }

  return freshContent
}

module.exports = {
  postById,
  postContent,
}
