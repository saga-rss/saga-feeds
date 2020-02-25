const { ApolloServer } = require('apollo-server-express')

const logger = require('../helpers/logger').getLogger()
const models = require('../models')
const { typeDefs, resolvers } = require('../schema')

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    models,
  },
  formatError: error => {
    logger.error(`Apollo Error: ${error.message}`, { error })
    return error
  },
})

module.exports = {
  apolloServer: server,
}
