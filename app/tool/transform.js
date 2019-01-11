const pipe = require('multipipe')
const through = require('through')
const iconv = require('iconv-lite')
const getCharset = require('charset')
const zlib = require('zlib')

module.exports = (transformers) => {
  return (req, res, next) => {
    const gunzip = zlib.createGunzip()
    const { writeHead } = res

    res.writeHead = function (code, headers) {
      let contentType = this.getHeader('content-type')

      // Setup processor pipeline
      const processors = []

      if (typeof contentType !== 'undefined') {
        for (let k in transformers) {
          const v = transformers[k]

          if (contentType.indexOf(k) === 0) {
            processors.push(v())
          }
        }
      }

      if (!processors.length) { // nothing to do
        return writeHead.apply(res, arguments)
      }

      // force charset to utf8
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
      processors.unshift(through(function write (data) {
        if (!charset) {
          charset = getCharset(res.headers, data)
        }

        if (charset && charset !== 'utf8') {
          data = iconv.encode(iconv.decode(data, charset), 'utf8')
          data = Buffer.from(data.toString().replace(charset, 'utf8'))
        }

        this.emit('data', data)
      }))

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

      const pr = pipe([].concat.apply([], processors))
      const { write } = res
      const { end } = res

      pr.on('data', function (buf) {
        write.call(res, buf)
      })

      res.write = function (data, encoding) {
        pr.write(data, encoding)
      }

      pr.on('end', function () {
        end.call(res)
      })

      res.end = function (data, encoding) {
        pr.end(data, encoding)
      }

      writeHead.apply(res, arguments)
    }

    next()
  }
}
