const bunyan = require('bunyan')

const logger = bunyan.createLogger({
  name: 'saga-feeds',
  level: 'debug',
  src: true,
  streams: [
    {
      stream: process.stdout,
    },
  ],
  serializers: bunyan.stdSerializers,
})

module.exports = {
  getLogger: function (component) {
    if (component) {
      return logger.child({ component: component })
    } else {
      return logger
    }
  },
}
