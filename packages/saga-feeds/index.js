const server = require('./services/server')
const mongoose = require('./services/mongoose')

mongoose.start()
server.start()

// graceful shutdown
const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT']
shutdownSignals.forEach(signal => {
  process.on(signal, function() {
    mongoose.stop()
    server.stop()
  })
})

module.exports = server
