module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  // Replace origin host to use relative urls in redirections
  const redirRgx = new RegExp(`(https?:)?(/{2})?${serverConfig.parsed_target.host}`, 'gi')

  proxy.on('proxyRes', (proxyRes) => {
    if (proxyRes.statusCode >= 301 && proxyRes.statusCode <= 302) {
      proxyRes.headers['location'] = proxyRes.headers['location'].replace(redirRgx, '')
    }
  })

  return (req, res, next) => next()
}
