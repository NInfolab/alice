const replaceStream = require('replacestream')
const config = require('../config')

module.exports = () => {
  const regexp = new RegExp(`(https?:)?(/{2})?${config.parsed_target.hostname}`, 'gi')

  const handlers = [
    replaceStream(regexp, ''),
    replaceStream(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (match) => {
      return match.split(regexp).join('')
    })
  ]

  if (config.hostnames_to_replace && Object.keys(config.hostnames_to_replace).length > 0) {
    for (let k in config.hostnames_to_replace) {
      handlers.push(replaceStream('//' + k, '//' + config.hostnames_to_replace[k]))
    }
  }

  return handlers
}
