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
 * `targetServer`. The promise is resolved with the proxy.
 */
const startProxy = (target) => {
  const proxy = alice.createProxy({
    target,
    modules: [['proxy', { timeout: 500 }]],
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

  it('responds with 521 if target doesn\'t exist', async () => {
    const proxy = await startProxy('http://alice-le-clown-n-existe-pas.fr')
    const response = await get(proxy)

    expect(response.statusCode).toBe(521)
  })

  // Commented out because of bug #80
  // it('responds with 521 if target never answers', async () => {
  //   const targetServer = await startTargetServer()

  //   targetServer.on('request', (req, res) => {
  //     // never answers
  //   })

  //   const proxy = await startProxy(`http://localhost:${targetServer.address().port}`)
  //   const response = await get(proxy)

  //   expect(response.statusCode).toBe(521)
  // })
})
