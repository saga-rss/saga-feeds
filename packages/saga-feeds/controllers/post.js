const { wrapAsync } = require('./utils')
const Post = require('../models/post')

const getPost = wrapAsync(async (req, res, next) => {
  const postId = req.params.postId
  const post = await Post.findById(postId)

  if (!post) {
    res.status(404)
      return res.json({ error: 'Post does not exist.' })
  }

  res.send(post)

  return next()
})

module.exports = {
  getPost,
}
