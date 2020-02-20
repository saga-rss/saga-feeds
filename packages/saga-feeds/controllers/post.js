const { wrapAsync } = require('./utils')
const Post = require('../models/post')
const { getArticleContent } = require('../helpers/getArticleContent')

const getPost = wrapAsync(async (req, res, next) => {
  const postId = req.params.postId
  let post = await Post.findById(postId)

  if (!post) {
    res.status(404)
    return res.json({ error: 'Post does not exist.' })
  }

  if (post.url) {
    const parsed = await getArticleContent(post.url)

    await Post.update(
      { _id: post._id },
      {
        content: parsed.content,
        direction: parsed.direction,
        wordCount: parsed.word_count,
        images: {
          featured: parsed.lead_image_url,
        },
      },
      {
        new: true,
      },
    )

    post = await Post.findOne({ _id: post._id })
  }

  res.send(post.detailView())

  return next()
})

module.exports = {
  getPost,
}
