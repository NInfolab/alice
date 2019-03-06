const transform = require('./transform')
const parsers = require('./parsers')

module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  return transform(parsers, serverConfig)
}
