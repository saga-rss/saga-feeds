const restify = require('restify')

const logger = require('../middlewares/logger').getLogger()
const requestLogger = require('../middlewares/requestLogger')
const feedRoutes = require('../controllers/feed')
const postRoutes = require('../controllers/post')

const server = restify.createServer()

server.use(requestLogger({ logger }))
server.use(restify.plugins.bodyParser())
server.use(restify.plugins.queryParser())

server.on('after', restify.plugins.auditLogger({
  log: require('../middlewares/logger').getLogger('audit'),
  event: 'after',
}))


server.get({ name: 'listFeeds', path: '/feeds' }, feedRoutes.listFeeds)
server.post({ name: 'createFeed', path: '/feeds' }, feedRoutes.createFeed)
server.get({ name: 'getFeed', path: '/feeds/:feedId'}, feedRoutes.getFeed)

server.get({ name: 'getPost', path: '/posts/:postId' }, postRoutes.getPost)

const start = () => {
  server.listen(8081, function () {
    logger.info('%s listening at %s', server.name, server.url)
  })
}

const stop = () => {
  logger.info('shutting down server')
  server.close()
}

module.exports = {
  start,
  stop,
}
