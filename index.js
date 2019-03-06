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

// Apply modules
if (config.modules && config.modules.length) {
  config.modules.forEach((module) => {
    if (typeof module === 'string' && modules[module]) {
      app.use(modules[module](config))
    } else {
      const moduleName = module[0]
      const moduleConfig = module[1] || {}

      if (modules[moduleName]) {
        app.use(modules[moduleName](proxy, config, moduleConfig))
      }
    }
  })
}

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
