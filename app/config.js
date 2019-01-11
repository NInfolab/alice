const { URL } = require('url')
const path = require('path')

// Get config from file
const config = process.argv[2] ? require(path.resolve(process.argv[2])) : require('../config')

config.parsed_target = new URL(config.target)
config.parsed_source = new URL(config.source)
config.log_path = path.resolve(config.log_path || './app.log')
module.exports = config
