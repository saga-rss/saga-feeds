const { ApolloServer } = require('apollo-server-express')

const logger = require('../helpers/logger').getLogger()
const models = require('../models')
const { typeDefs, resolvers } = require('../endpoints')

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    models,
    user: req.user, // user extracted from JWT
  }),
  formatError: error => {
    logger.error(`Apollo Error: ${error.message}`, { error })
    return error
  },
})

module.exports = {
  apolloServer: server,
}
