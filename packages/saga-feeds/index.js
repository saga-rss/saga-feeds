const server = require('./services/server')
const mongoose = require('./services/mongoose')

mongoose.start()
server.start()

process.on('SIGINT', function() {
  mongoose.stop()
  server.stop()
})

module.exports = server
