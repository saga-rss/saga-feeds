const got = require("got");

const config = require("../config");

const client = got.extend({
  headers: {
    "user-agent": config.userAgent
  }
});

module.exports = client;
