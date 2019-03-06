module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  return (req, res, next) => {
    // @TODO: temporary, to force server to not gzip response, we should be able to handle this
    delete req.headers['accept-encoding']
    return next()
  }
}
