module.exports = {
  apps: [
    {
      name: 'saga-api',
      script: './index.js',
      autorestart: true,
      watch: true,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
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
