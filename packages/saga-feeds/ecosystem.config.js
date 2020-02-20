module.exports = {
  apps: [
    {
      name: 'saga-api',
      script: './index.js',
      watch: true,
    },
    {
      name: 'saga-feed-updater',
      script: './daemon/feed-updater.js',
      watch: true,
    },
    {
      name: 'saga-meta-updater',
      script: './daemon/meta-updater.js',
      watch: true,
    },
  ],
}
