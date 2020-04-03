const Redis = require('ioredis')

const config = require('../config')
const redis = new Redis(config.redis.uri)
const logger = require('../helpers/logger').getLogger('redis')

redis.on('connect', function() {
  logger.info('Redis client connected')
})

redis.on('error', function(error) {
  logger.error(`Error in Redis client initialization`, { error })
})

const subscriber = new Redis(config.redis.uri)

subscriber.on('connect', function() {
  logger.info('Redis client connected (subscriber)')
})

subscriber.on('error', function(error) {
  logger.error(`Error in Redis client initialization (subscriber)`, { error })
})

const publisher = new Redis(config.redis.uri)

publisher.on('connect', function() {
  logger.info('Redis client connected (publisher)')
})

publisher.on('error', function(error) {
  logger.error(`Error in Redis client initialization (publisher)`, { error })
})

// options for bull queues
const bullOptions = {
  prefix: config.appName,
  createClient: function(type) {
    switch (type) {
      case 'client':
        return publisher
      case 'subscriber':
        return subscriber
      default:
        return redis
    }
  },
}

module.exports = {
  bullOptions,
  redis,
  subscriber,
  publisher,
}
