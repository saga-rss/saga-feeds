module.exports = {
  apps: [
    {
      name: 'saga-api',
      script: './src/index.js',
      watch: ['src'],
      ignore_watch: ['node_modules', 'exports', '.git', 'etc', '.idea'],
    },
    {
      name: 'saga-feed-updater',
      script: './src/daemon/feed-updater.js',
      watch: ['src'],
      ignore_watch: ['node_modules', 'exports', '.git', 'etc', '.idea'],
    },
    {
      name: 'saga-meta-updater',
      script: './src/daemon/meta-updater.js',
      watch: ['src'],
      ignore_watch: ['node_modules', 'exports', '.git', 'etc', '.idea'],
    },
  ],
}
