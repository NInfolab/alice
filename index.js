#!/bin/env node

const httpProxy = require('http-proxy')
const connect = require('connect')
const http = require('http')
const config = require('./app/config')
const modules = require('./modules')

// Basic Connect App
const app = connect()

// Initialize reverse proxy
const proxy = httpProxy.createProxyServer({ secure: false })

// Handle proxy response
const redirRgx = new RegExp(`(https?:)?(/{2})?${config.parsed_target.host}`, 'gi')
proxy.on('proxyRes', (proxyRes) => {
  if (proxyRes.statusCode >= 301 && proxyRes.statusCode <= 302) {
    proxyRes.headers['location'] = proxyRes.headers['location'].replace(redirRgx, '')
  }

  // Allow all CORS domain by default
  proxyRes.headers['Access-Control-Allow-Origin'] = '*'
})

// Handle http requests
app.use((req, res, next) => {
  req._old_headers = Object.assign({}, req.headers)

  req.headers['host'] = config.parsed_target.host
  req.headers['origin'] = config.target

  next()
})

const transforms = {
  'text/html': require('./app/parsers/html'),
  'application/javascript': require('./app/parsers/javascript'),
  'text/plain': require('./app/parsers/txt')
}

app.use(require('./app/tool/transform')(transforms))

// Apply modules
if (config.modules && config.modules.length) {
  config.modules.forEach((module) => {
    if (typeof module === 'string' && modules[module]) {
      app.use(modules[module](config))
    } else {
      const moduleName = module[0]
      const moduleConfig = module[1] || {}

      if (modules[moduleName]) {
        app.use(modules[moduleName](config, moduleConfig))
      }
    }
  })
}

// Proxying
app.use((req, res) => {
  delete req.headers['accept-encoding']
  proxy.web(req, res, { target: config.target })
})

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  // @TODO: handle errors, display info for user
  console.error(err)

  res.writeHead(500, { 'Content-Type': 'text/plain' })
  res.end('We are sorry, but we cannot serve this request.')
})

http.createServer(app).listen(config.port, () => {
  console.log(`Server listen on http://127.0.0.1:${config.port}`)
})
