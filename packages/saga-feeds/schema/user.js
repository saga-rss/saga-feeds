const validator = require('validator')
const { UserInputError, ApolloError } = require('apollo-server-express')

const userById = async (source, { id }, context) => {
  let user = await context.models.user.findById(id)

  if (!user) {
    throw new ApolloError('user not found', 'NOT_FOUND')
  }

  return user
}

const userCreate = async (source, { displayName, email, password, username }, context) => {
  const newUser = {
    displayName: displayName,
    username: username.trim(),
    email: email.trim(),
    normalizedEmail: validator.normalizeEmail(email.trim()),
    password,
  }

  // validate provided email address
  if (!validator.isEmail(newUser.email)) {
    throw new UserInputError('bad email', {
      email: newUser.email,
    })
  }

  // validate provided username
  if (!validator.matches(newUser.username, /^[\w-]+$/)) {
    throw new UserInputError('bad username', {
      username: newUser.username,
    })
  }

  const exists = await context.models.user.findOne({
    $or: [{ normalizedEmail: newUser.normalizedEmail }, { username: newUser.username }],
  })

  if (exists) {
    throw new UserInputError('already exists', {
      email: newUser.email,
      username: newUser.username,
    })
  }

  const user = await context.models.user.create(newUser)

  return user
}

const userSearch = async (source, { id }, context) => {
  let users = []

  if (id) {
    const user = await context.models.user.findById(id)
    users.push(user)
  } else {
    users = await context.models.user.find()
  }

  return users
}

module.exports = {
  userById,
  userCreate,
  userSearch,
}
