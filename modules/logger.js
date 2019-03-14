const pino = require('pino')
const pinoHttp = require('pino-http')

// Is dev env ?
const isdev = process.env.NODE_ENV === 'development'

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

const logger = pino({ prettyPrint: isdev })
const proxyLogger = logger.child({ type: 'proxy' })

const httpLogger = pinoHttp({
  useLevel: 'info',
  logger: logger.child({ type: 'http' }),
  serializers
})

module.exports = (proxy) => {
  // Log proxy error
  proxy.on('error', proxyLogger.error.bind(proxyLogger))

  return httpLogger
}
