const server = require('./services/server')
const mongoose = require('./services/mongoose')

mongoose.connect()
server.start()

module.exports = server
