const config = require('../config')
const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')

mongoose.connection.on('connected', () => {
  console.log('MongoDB is connected')
})

mongoose.connection.on('error', (err) => {
  console.log(`Could not connect to MongoDB because of ${err}`)
  process.exit(-1)
})

if (config.env === 'development') {
  mongoose.set('debug', true)
}

module.exports.connect = () => {
  const uri = config.mongo.uri

  mongoose.connect(uri, {
    keepAlive: 1,
    useNewUrlParser: true
  })

  return mongoose.connection
}
