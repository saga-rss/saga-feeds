const uuid = require('uuid')
const querystring = require('querystring')
const url = require('url')

module.exports = function logRequest(options) {
  const logger = options.logger
  const headerName = options.headerName || 'x-request-id'
  const rewriteParams = options.rewriteParams || ['token', 'refreshToken', 'authToken']
  const replacementText = options.replacementText || '*****'

  function getClientAddress(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress
  }

  return function (req, res, next) {
    const id = req.headers[headerName] || uuid.v4()
    const startOpts = { req: req }

    req.id = id
    req.log = logger.child({
      id: id,
      serializers: logger.constructor.stdSerializers,
    })

    if (req.body) {
      startOpts.body = req.body
    }

    res.setHeader(headerName, id)

    // replace any URL parameters that should be hidden
    let parsedUrl = url.parse(req.url)
    let params
    if (parsedUrl.query) {
      params = querystring.parse(parsedUrl.query)
      for (const param in params) {
        if (typeof (params) == 'object' && typeof (params.hasOwnProperty) == 'function') {
          if (params.hasOwnProperty(param)) {
            if (rewriteParams.indexOf(param) >= 0) {
              params[param] = replacementText
            }
          }
        }
      }
    }

    const time = process.hrtime()
    res.on('finish', function responseSent() {
      const diff = process.hrtime(time)
      const message = `${getClientAddress(req)} - ${new Date().toISOString()} ${req.method} ${req.url} HTTP/${req.httpVersion} ${res.statusCode}`
      const context = {
        ip: getClientAddress(req),
        method: req.method,
        url: (params) ? parsedUrl.pathname + '?' + querystring.stringify(params) : req.url,
        req,
        res,
        duration: diff[0] * 1e3 + diff[1] * 1e-6,
      }
      req.log.info(context, message)
    })

    next()
  }
}
