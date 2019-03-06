const replaceStream = require('replacestream')

module.exports = (serverConfig) => {
  return () => {
    const regexp = new RegExp(`(https?:)?(/{2})?${serverConfig.parsed_target.hostname}`, 'gi')
    return replaceStream(regexp, '')
  }
}
