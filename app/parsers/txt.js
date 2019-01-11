const replaceStream = require('replacestream')
const config = require('../config')

module.exports = (req, res) => {
  const regexp = new RegExp(`(https?:)?(/{2})?${config.parsed_target.hostname}`, 'gi')

  const handlers = [
    replaceStream(regexp, `http://${req._old_headers.host}`)
  ]

  if (config.hostnames_to_replace && Object.keys(config.hostnames_to_replace).length > 0) {
    for (let k in config.hostnames_to_replace) {
      handlers.push(replaceStream('//' + k, '//' + config.hostnames_to_replace[k]))
    }
  }

  return handlers
}
