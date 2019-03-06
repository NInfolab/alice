const { URL } = require('url')
const path = require('path')

// Get config from file
const config = process.argv[2] ? require(path.resolve(process.argv[2])) : require('./config')

config.parsed_target = new URL(config.target)
module.exports = config
