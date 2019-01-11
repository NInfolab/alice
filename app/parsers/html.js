const replaceStream = require('replacestream')
const config = require('../config')

module.exports = () => {
  const regexp = new RegExp(`(https?:)?(/{2})?${config.parsed_target.hostname}`, 'gi')
  let replacer = [config.parsed_source.protocol, '//', config.parsed_source.hostname]

  if (config.parsed_source.port) {
    replacer.push(':')
    replacer.push(config.parsed_source.port)
  }

  replacer = replacer.join('')

  const handlers = [
    replaceStream(regexp, replacer),
    replaceStream(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (match) => {
      return match.split(regexp).join(replacer)
    })
  ]

  if (config.hostnames_to_replace && Object.keys(config.hostnames_to_replace).length > 0) {
    for (let k in config.hostnames_to_replace) {
      handlers.push(replaceStream('//' + k, '//' + config.hostnames_to_replace[k]))
    }
  }

  return handlers
}
