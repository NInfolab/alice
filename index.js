const httpProxy = require('http-proxy')
const connect = require('connect')
const http = require('http')
const fs = require('fs')
const morgan = require('morgan')
const config = require('./app/config')

// Basic Connect App
const app = connect()

// Initialize reverse proxy
const proxy = httpProxy.createProxyServer({ secure: false })

// Handle proxy response
proxy.on('proxyRes', (proxyRes) => {
  if (proxyRes.statusCode >= 301 && proxyRes.statusCode <= 302) {
    proxyRes.headers['location'] = proxyRes.headers['location'].replace(config.parsed_target.host, '')
  }

  // Allow all CORS domain by default
  proxyRes.headers['Access-Control-Allow-Origin'] = '*'
})

// Use morgan as logger
const accessLogStream = fs.createWriteStream(config.log_path, { flags: 'a' })

app.use(morgan('tiny', { stream: accessLogStream }))

// Handle http requests
app.use((req, res, next) => {
  req.headers['host'] = config.parsed_target.host
  req.headers['origin'] = config.target

  next()
})

const transforms = {
  'text/html': require('./app/parsers/html'),
  'application/javascript': require('./app/parsers/javascript')
}

app.use(require('./app/tool/transform')(transforms))

app.use((req, res) => {
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
