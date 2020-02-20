module.exports = {
  apps: [
    {
      name: 'saga-api',
      script: './index.js',
      autorestart: true,
      watch: true,
    },
    {
      name: 'saga-feed-updater',
      script: './daemon/feed-updater.js',
      watch: true,
      autorestart: true,
      args: '-d',
    },
    {
      name: 'saga-meta-updater',
      script: './daemon/meta-updater.js',
      watch: true,
      autorestart: true,
      args: '-d',
    },
  ],
}
