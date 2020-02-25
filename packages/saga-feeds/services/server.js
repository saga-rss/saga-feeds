const express = require('express')

const config = require('../config')
const logger = require('../helpers/logger').getLogger()
const { apolloServer } = require('./apollo')
const requestLogger = require('../helpers/requestLogger')

const server = express()

server.use(requestLogger({ logger }))

// attach apollo to express
apolloServer.applyMiddleware({ app: server })

const start = () => {
  server.listen(config.server.port, function() {
    logger.info(`%s listening at ${config.server.port}`, server.name)
  })
}

const stop = () => {
  logger.info('shutting down express / graphql server')
}

module.exports = {
  start,
  stop,
}
