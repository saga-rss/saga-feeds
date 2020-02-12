const config = require('../config')
const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')

const logger= require('../middlewares/logger').getLogger()

mongoose.connection.on('connected', () => {
  logger.info('MongoDB is connected')
})

mongoose.connection.on('error', (err) => {
  logger.error(`Could not connect to MongoDB because of ${err}`)
  process.exit(-1)
})

if (config.env === 'development') {
  // mongoose.set('debug', true)
}

const start = (cb) => {
  logger.info('starting mongodb connection')

  const uri = config.mongo.uri

  return mongoose.connect(uri, {
    keepAlive: 1,
    useNewUrlParser: true,
    useFindAndModify: false,
  }, cb)
}

const stop = (cb) => {
  logger.info('shutting down mongodb connection')
  return mongoose.disconnect(cb)
}

module.exports = {
  start,
  stop,
}
