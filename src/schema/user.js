const validator = require("validator");
const { UserInputError, ApolloError } = require("apollo-server-express");

const validateEmail = email => {
  if (!email || !validator.isEmail(email)) {
    throw new UserInputError("bad email", {
      email
    });
  }
  return true;
};

const validateUsername = username => {
  if (!username || !validator.matches(username, /^[\w-]+$/)) {
    throw new UserInputError("bad username", {
      username
    });
  }
  return true;
};

const userById = async (source, { id }, context) => {
  let user = await context.models.user.findById(id);

  if (!user) {
    throw new ApolloError("user not found", "NOT_FOUND");
  }

  return user;
};

const userCreate = async (
  source,
  { displayName, email, password, username },
  context
) => {
  const newUser = {
    displayName: displayName,
    username: username.trim(),
    email: email.trim(),
    normalizedEmail: validator.normalizeEmail(email.trim()),
    password
  };

  // validate provided email address
  validateEmail(newUser.email);

  // validate provided username
  validateUsername(newUser.username);

  const exists = await context.models.user.findOne({
    $or: [
      { normalizedEmail: newUser.normalizedEmail },
      { username: newUser.username }
    ]
  });

  if (exists) {
    throw new UserInputError("already exists", {
      email: newUser.normalizedEmail === exists.normalizedEmail,
      username: newUser.username === exists.username
    });
  }

  const user = await context.models.user.create(newUser);

  return user;
};

const userSearch = async (source, { id }, context) => {
  let users = [];

  if (id) {
    const user = await context.models.user.findById(id);
    users.push(user);
  } else {
    users = await context.models.user.find();
  }

  return users;
};

const userToken = async (source, args, context) => {
  if (
    source instanceof context.models.user &&
    (!context.user || (context.user && context.user.sub === source.id))
  ) {
    return source.getToken();
  }
  return "";
};

const userLogin = async (source, { email, password }, context) => {
  const normalizedEmail = validator.normalizeEmail(email.trim());
  const user = await context.models.user.findOne({ normalizedEmail });

  if (!user) {
    throw new ApolloError("user not found", "NOT_FOUND");
  }

  if (!(await user.verifyPassword(password))) {
    throw new UserInputError("invalid password");
  }

  return user;
};

module.exports = {
  userById,
  userCreate,
  userLogin,
  userSearch,
  userToken
};
