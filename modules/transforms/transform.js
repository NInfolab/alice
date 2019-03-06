const pipe = require('multipipe')
const Stream = require('stream')
const iconv = require('iconv-lite')
const getCharset = require('charset')
const zlib = require('zlib')

module.exports = (parsers, serverConfig) => {
  return (req, res, next) => {
    const gunzip = zlib.createGunzip()
    const { writeHead, write, end } = res

    res.writeHead = function (code, headers) {
      let contentType = this.getHeader('content-type')

      // Setup processor pipeline
      const processors = []

      if (typeof contentType !== 'undefined') {
        for (let k in parsers) {
          const v = parsers[k]

          if (contentType.indexOf(k) === 0) {
            processors.push(v(serverConfig)(req, res))
          }
        }
      }

      if (!processors.length) { // nothing to do
        return writeHead.apply(res, arguments)
      }

      // // force charset to utf8
      let charset = getCharset(contentType)

      // Do nothing unless the content-type is text. (Fix #21)
      if (!contentType.match('^text/*')) {
        return writeHead.apply(res, arguments)
      }

      if (res.getHeader('Content-Type') && charset) {
        res.setHeader('Content-Type', res.getHeader('Content-Type').replace(charset, ('utf8')))
      }

      // Strip off the content length since it will change.
      res.removeHeader('Content-Length')

      if (headers) {
        delete headers['content-length']
      }

      // Force content type to utf8
      const transform = new Stream.Transform({ objectMode: true })
      transform._transform = (data, _, done) => {
        if (!charset) {
          charset = getCharset(res.headers, data)
        }

        if (charset && charset !== 'utf8') {
          data = iconv.encode(iconv.decode(data, charset), 'utf8')
          data = Buffer.from(data.toString().replace(charset, 'utf8'))
        }

        done(null, data)
      }

      processors.unshift(transform)

      // Gunzip response if Gziped
      const contentEncoding = this.getHeader('content-encoding')
      if (contentEncoding && contentEncoding.toLowerCase() === 'gzip') {
        processors.unshift(gunzip)

        // Strip off the content encoding since it will change.
        res.removeHeader('Content-Encoding')

        if (headers) {
          delete headers['content-encoding']
        }
      }

      const pr = pipe(...processors)

      res.write = (data, encoding) => pr.write(data, encoding)
      res.end = pr.end.bind(pr)

      pr.on('data', function (buf) {
        write.call(res, buf)
      })

      pr.on('end', function () {
        end.call(res)
      })

      writeHead.apply(res, arguments)
    }

    next()
  }
}
