module.exports = {
  apps: [
    {
      name: "saga-api",
      script: "./src/index.js",
      watch: true
    },
    {
      name: "saga-feed-updater",
      script: "./src/daemon/feed-updater.js",
      watch: true,
      args: "-v"
    },
    {
      name: "saga-meta-updater",
      script: "./src/daemon/meta-updater.js",
      watch: true,
      args: "-v"
    }
  ]
};
