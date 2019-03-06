const replaceStream = require('replacestream')

module.exports = (serverConfig) => {
  return (req, res) => {
    const regexp = new RegExp(`(https?:)?(/{2})?${serverConfig.parsed_target.hostname}`, 'gi')

    const handlers = [
      replaceStream(regexp, `http://${req._old_headers.host}`)
    ]

    if (serverConfig.hostnames_to_replace && Object.keys(serverConfig.hostnames_to_replace).length > 0) {
      for (let k in serverConfig.hostnames_to_replace) {
        handlers.unshift(replaceStream('//' + k, '//' + serverConfig.hostnames_to_replace[k]))
      }
    }

    return handlers
  }
}
