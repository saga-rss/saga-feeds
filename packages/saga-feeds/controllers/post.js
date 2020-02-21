const { wrapAsync } = require('./utils')
const Post = require('../models/post')
const { updatePostContent, updatePostMeta } = require('../helpers/processPost')

const getPost = wrapAsync(async (req, res, next) => {
  const postId = req.params.postId
  let post = await Post.findById(postId)

  if (!post) {
    res.status(404)
    return res.json({ error: 'Post does not exist.' })
  }

  if (post.url) {
    const forceUpdate = !post.content || post.content.length < 0
    await updatePostContent(post._id, post.url, forceUpdate)
    await updatePostMeta(post._id, post.url, forceUpdate)
    await Post.setStaleDate(post._id)

    post = await Post.findOne({ _id: post._id })
  }

  res.send(post.detailView())

  return next()
})

module.exports = {
  getPost,
}
