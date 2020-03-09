const http = require('http')
const alice = require('../index.js')

/**
 * Return a promise resolving when `server` is listening for connections.
 * The promise is resolved withe `server`.
 */
const startServer = (server) => {
  return new Promise((resolve, reject) => {
    server.on('listening', () => { resolve(server) })
    server.listen()
  })
}

/**
 * Return a promise resolving when Alice is proxying to
 * `target`. The promise is resolved with the proxy.
 */
const startProxy = (target, modules = [['proxy', { timeout: 2000 }]]) => {
  const proxy = alice.createProxy({
    target,
    modules,
    'parsed_target': new URL(target)
  })

  return startServer(proxy)
}

/**
 * Return a promise resolving when an http server is listening.
 * The promise is resolved with the server.
 */
const startTargetServer = () => {
  return startServer(http.createServer())
}

/**
 * Do a GET request to the address where `proxy` is listening.
 * Return a promise resolving when the request responds. The
 * promise is resolved with the response.
 */
const get = (proxy) => {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${proxy.address().port}`

    http.get(url, (res) => {
      resolve(res)
    })
  })
}

describe('alice\'s proxy', () => {
  it('responds with 404 if target responds with 404', async () => {
    const targetServer = await startTargetServer()

    targetServer.on('request', (req, res) => {
      res.statusCode = 404
      res.end()
    })

    const proxy = await startProxy(`http://localhost:${targetServer.address().port}`)
    const response = await get(proxy)

    expect(response.statusCode).toBe(404)
  })

  it('responds with 521 if target won\'t accept the connection', async () => {
    const proxy = await startProxy('http://localhost:9987')
    const response = await get(proxy)

    expect(response.statusCode).toBe(521)
  })

  it('responds with 521 if target never answers', async () => {
    const targetServer = await startTargetServer()

    targetServer.on('request', (req, res) => {
      // never answers
    })

    const proxy = await startProxy(
      `http://localhost:${targetServer.address().port}`,
      // minimize timeout to make the test run faster:
      [['proxy', { timeout: 1 }]]
    )
    const response = await get(proxy)

    expect(response.statusCode).toBe(521)
  })

  it('responds with the target response', async () => {
    const targetServer = await startTargetServer()
    const message = 'some response from the target'
    const statusCode = 200
    const contentType = 'text/plain'

    targetServer.on('request', (req, res) => {
      res.writeHead(statusCode, { 'Content-Type': contentType })
      res.end(message)
    })

    const proxy = await startProxy(`http://localhost:${targetServer.address().port}`)
    const response = await get(proxy)

    expect(response.statusCode).toEqual(statusCode)
    expect(response.headers['content-type']).toEqual(contentType)

    return new Promise((resolve, reject) => {
      response.on('data', (data) => {
        expect(data.toString()).toEqual(message)
        resolve()
      })
    })
  })

  it('doesn\'t crash after handling target response', async () => {
    // This test makes sure that the code taking care of responding
    // when the target never responds doesn't crash when the target responds

    const targetServer = await startTargetServer()
    const message = 'some response from the target'

    targetServer.on('request', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end(message)
    })

    const proxy = await startProxy(
      `http://localhost:${targetServer.address().port}`,
      // the timeout should be large enough for the targetServer to answer
      // first but still be smaller than Jasmine's own timeout
      [['proxy', { timeout: jasmine.DEFAULT_TIMEOUT_INTERVAL / 10 }]]
    )
    const response = await get(proxy)

    return new Promise((resolve, reject) => {
      response.on('data', (data) => {
        expect(data.toString()).toEqual(message)

        // give the proxy's timeout the time to trigger:
        setTimeout(() => {
          resolve()
        }, jasmine.DEFAULT_TIMEOUT_INTERVAL / 8)
      })
    })
  })
})
