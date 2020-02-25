const server = require('./services/server')
const mongoose = require('./services/mongoose')
const apollo = require('./services/apollo')

server.start()
mongoose.start()

// graceful shutdown
const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT']
shutdownSignals.forEach(signal => {
  process.on(signal, function() {
    server.stop()
    mongoose.stop()
  })
})

module.exports = apollo
