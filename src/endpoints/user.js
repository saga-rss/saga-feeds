const Promise = require('bluebird')
const validator = require('validator')
const { UserInputError, ApolloError, AuthenticationError } = require('apollo-server-express')

const validateEmail = email => {
  if (!email || !validator.isEmail(email)) {
    throw new UserInputError('bad email', {
      email,
    })
  }
  return true
}

const validateUsername = username => {
  if (!username || !validator.matches(username, /^[\w-]+$/)) {
    throw new UserInputError('bad username', {
      username,
    })
  }
  return true
}

const userById = async (source, { id }, context) => {
  let user = await context.models.user.findById(id)

  if (!user) {
    throw new ApolloError('user not found', 'NOT_FOUND')
  }

  return user
}

const userCreateOrUpdate = async (source, { displayName, email, interests, password, username }, context) => {
  const newUser = {
    displayName: displayName.trim(),
    email: email.trim(),
    interests,
    normalizedEmail: validator.normalizeEmail(email.trim()),
    password,
    username: username.trim(),
  }

  // validate provided email address
  validateEmail(newUser.email)

  // validate provided username
  validateUsername(newUser.username)

  const exists = await context.models.user.findOne({
    $or: [{ normalizedEmail: newUser.normalizedEmail }, { username: newUser.username }],
  })

  let user

  if (exists) {
    if (context.user && context.user.sub === exists.id) {
      await context.models.user.update({ _id: exists.id }, newUser)
      user = await context.models.user.findById(exists.id)
    } else {
      throw new UserInputError('already exists', {
        email: newUser.normalizedEmail === exists.normalizedEmail,
        username: newUser.username === exists.username,
      })
    }
  } else {
    user = await context.models.user.create(newUser)
  }

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

const userInterests = async (source, args, context) => {
  if (source instanceof context.models.user) {
    return source.getInterests()
  }
  return []
}

const userToken = async (source, args, context) => {
  if (source.token) return source.token

  if (source instanceof context.models.user && (!context.user || (context.user && context.user.sub === source.id))) {
    return source.getToken()
  }
  return ''
}

const userLogin = async (source, { email, password }, context) => {
  const normalizedEmail = validator.normalizeEmail(email.trim())
  const user = await context.models.user.findOne({ normalizedEmail })

  if (!user) {
    throw new ApolloError('user not found', 'NOT_FOUND')
  }

  if (!(await user.verifyPassword(password))) {
    throw new UserInputError('invalid password')
  }

  const token = user.getToken()

  return { ...user._doc, token }
}

const userLatestInterests = async (source, params, context) => {
  const user = await context.models.user.findById(context.user.sub)

  console.log(user)

  return []
}

module.exports = {
  userById,
  userCreateOrUpdate,
  userInterests,
  userLatestInterests,
  userLogin,
  userSearch,
  userToken,
}
