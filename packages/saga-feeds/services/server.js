const restify = require('restify')

const logger = require('../middlewares/logger')
const requestLogger = require('../middlewares/requestLogger')
const feedRoutes = require('../controllers/feed')
const postRoutes = require('../controllers/post')

const server = restify.createServer()
const log = logger.getLogger()

server.use(requestLogger({ logger: log }))
server.use(restify.plugins.bodyParser())
server.use(restify.plugins.queryParser())

server.on('after', restify.plugins.auditLogger({
  log: logger.getLogger('audit'),
  event: 'after',
}))


server.get({ name: 'listFeeds', path: '/feeds' }, feedRoutes.listFeeds)
server.post({ name: 'createFeed', path: '/feeds' }, feedRoutes.createFeed)
server.get({ name: 'getFeed', path: '/feeds/:feedId'}, feedRoutes.getFeed)

server.get({ name: 'getPost', path: '/posts/:postId' }, postRoutes.getPost)

module.exports.start = () => {
  server.listen(8081, function () {
    console.log('%s listening at %s', server.name, server.url)
  })
}
