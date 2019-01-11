const replaceStream = require('replacestream')
const config = require('../config')

module.exports = () => {
  const regexp = new RegExp(`(https?:)?(/{2})?${config.parsed_target.hostname}`, 'gi')
  const replacer = [config.parsed_source.protocol, '//', config.parsed_source.hostname]

  return replaceStream(regexp, replacer)
}
