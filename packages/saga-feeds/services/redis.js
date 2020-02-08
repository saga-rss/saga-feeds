const Redis = require('ioredis')

const config = require('../config')
const redis = new Redis(config.redis.port, config.redis.host)
const logger = require('../middlewares/logger')
  .getLogger('redis')

redis.on('connect', function () {
  logger.info('Redis client connected')
})

redis.on('error', function (error) {
  logger.error(`Error in Redis client initialization`, { error })
})

const subscriberRedis = new Redis(config.redis.port, config.redis.host)
const subscriberLogger = require('../middlewares/logger')
  .getLogger('redis-subscriber')

subscriberRedis.on('connect', function () {
  subscriberLogger.info('Redis client connected')
})

subscriberRedis.on('error', function (error) {
  subscriberLogger.error(`Error in Redis client initialization`, { error })
})

const publisherRedis = new Redis(config.redis.port, config.redis.host)
const publisherLogger = require('../middlewares/logger')
  .getLogger('redis-publisher')

publisherRedis.on('connect', function () {
  publisherLogger.info('Redis client connected')
})

publisherRedis.on('error', function (error) {
  publisherLogger.error(`Error in Redis client initialization`, { error })
})

module.exports = {
  redis,
  subscriberRedis,
  publisherRedis,
}
