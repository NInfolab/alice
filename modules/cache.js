module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  return (req, res, next) => {
    return next()
  }
}
