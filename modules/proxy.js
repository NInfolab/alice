module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  proxy.on('error', (err, req, res) => {
    switch (err.errno) {
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
        // 521: web server is down
        res.writeHead(521, { 'Content-Type': 'text/plain' })
        res.end('The target server seems to be down. Please try again later.')
        break
      default:
        let message = `We are sorry, but we cannot serve this request:\n\n`

        for (let key of Object.keys(err)) {
          message += `${key}: ${err[key]}\n`
        }

        res.writeHead(500, { 'Content-Type': 'text/plain' })

        res.end(message)
    }
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
