module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  // Allow all CORS domain by default
  proxy.on('proxyRes', (proxyRes) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*'
  })

  return (req, res, next) => next()
}
