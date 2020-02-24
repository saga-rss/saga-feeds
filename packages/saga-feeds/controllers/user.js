const validator = require('validator')

const { wrapAsync } = require('./utils')
const User = require('../models/user')

const listUsers = wrapAsync(async function listUsers(req, res, next) {
  const users = await User.apiQuery(req.query)

  res.send(users.map(user => user.detailView()))

  return next()
})

const createUser = wrapAsync(async function createUser(req, res, next) {
  const data = req.body

  if (!data.displayName || !data.email || !data.username || !data.password) {
    res.status(400)
    res.json({ message: 'you are missing something' })
    return next()
  }

  const newUser = {
    ...data,
    username: data.username.trim(),
    email: data.email.trim(),
    normalizedEmail: validator.normalizeEmail(data.email.trim()),
  }

  // validate provided email address
  if (!validator.isEmail(newUser.email)) {
    res.status(409)
    res.json({ message: 'invalid email' })
    return next()
  }

  // validate provided username
  if (!validator.matches(newUser.username, /^[\w-]+$/)) {
    res.status(409)
    res.json({ message: 'invalid username' })
    return next()
  }

  const exists = await User.findOne({
    $or: [{ normalizedEmail: newUser.normalizedEmail }, { username: newUser.username }],
  })

  if (exists) {
    res.status(409)
    res.json({ message: 'this user already exists' })
    return next()
  }

  const user = await User.create(newUser)

  res.status(210)
  res.send({
    ...user.detailView(),
    token: user.getToken(),
  })

  return next()
})

const getUser = wrapAsync(async function getUser(req, res, next) {
  const user = await User.findById(req.params.userId)

  if (req.user.sub === user._id.toString()) {
    user.token = user.getToken()
  }

  res.send(user)

  return next()
})

const updateUser = wrapAsync(async function updateUser(req, res, next) {
  const data = req.body || {}

  // a user can update themselves only,
  // except admins can update anyone
  if (req.params.userId !== req.user.sub && !req.user.isAdmin) {
    return res.status(403)
  }

  // try to find the user
  let user = await User.findById(req.params.userId)
  if (!user) {
    return res.status(404)
  }

  // check user email
  if (data.email) {
    // validate provided email address
    if (!validator.isEmail(data.email)) {
      return res.status(409)
    }

    // check to see if this email is used
    const isExisting = await User.findOne({ normalizedEmail: validator.normalizeEmail(data.email) })
    if (isExisting && isExisting._id !== user._id) {
      return res.status(409)
    }
  }

  // check user username
  if (data.username) {
    // validate provided username
    if (!validator.matches(data.username, /^[\w-]+$/)) {
      return res.status(409)
    }

    // check to see if this username is used
    const isExisting = await User.findOne({ username: data.username })
    if (isExisting && isExisting._id !== user._id) {
      return res.status(409)
    }
  }

  // provided user data seems valid
  user = await User.findOneAndUpdate({ _id: req.params.userId }, data, { new: true })

  res.status(201).json(user)

  return next()
})

module.exports = {
  createUser,
  getUser,
  listUsers,
  updateUser,
}
