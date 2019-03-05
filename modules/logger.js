const pino = require('pino')
const pinoHttp = require('pino-http')

// Define custom serializer
const serializers = {
  req: (req) => {
    return {
      method: req.method,
      url: req.url,
      id: (typeof req.id === 'function' ? req.id() : (req.id || (req.info ? req.info.id : undefined)))
    }
  },
  res: (res) => {
    return {
      statusCode: res.statusCode
    }
  }
}

const logger = pinoHttp({
  logger: pino(),
  useLevel: 'info',
  serializers
})

module.exports = () => logger
