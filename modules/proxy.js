module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  return (req, res) => {
    // Replace request host & origin headers
    req._old_headers = Object.assign({}, req.headers)
    req.headers['host'] = serverConfig.parsed_target.host
    req.headers['origin'] = serverConfig.target

    // Proxy request to target
    proxy.web(req, res, { target: serverConfig.target })
  }
}
