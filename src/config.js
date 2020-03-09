const appInfo = require('../package.json')

module.exports = {
  appName: appInfo.name,
  env: process.env.NODE_ENV,
  feedRefreshInterval: 60 * 15 * 1000, // once per 15 minutes
  jwt: {
    secret: process.env.SAGA_JWT_SECRET,
    issuer: process.env.SAGA_JWT_ISSUER,
  },
  logLevel: process.env.SAGA_LOG_LEVEL || 'error',
  metaRefreshInterval: 24 * 60 * 60 * 1000, // once per day
  mongo: {
    uri: process.env.SAGA_MONGO_URI,
  },
  redis: {
    uri: process.env.SAGA_REDIS_URI,
  },
  server: {
    port: process.env.SAGA_SERVER_PORT,
  },
  userAgent: `${appInfo.name}/${appInfo.version} ${appInfo.author} ${appInfo.homepage}`,
}
