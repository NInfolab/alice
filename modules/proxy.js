module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  // Handle proxy errors
  proxy.on('error', (err, req, res) => {
    // @TODO: handle errors, display info for user
    console.error(err)

    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('We are sorry, but we cannot serve this request.')
  })

  return (req, res) => {
    // Replace request host & origin headers
    req._old_headers = Object.assign({}, req.headers)
    req.headers['host'] = serverConfig.parsed_target.host
    req.headers['origin'] = serverConfig.target

    // Proxy request to target
    proxy.web(req, res, { target: serverConfig.target })
  }
}
