const pipe = require('multipipe')
const iconv = require('iconv-lite')
const getCharset = require('charset')
const zlib = require('zlib')
const parsers = require('./parsers')

module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  return (req, res, next) => {
    const { writeHead, write, end } = res
    const processors = []
    let pr

    const loadPr = () => {
      if (pr) {
        return pr
      }

      // Apply transform depending of content-type
      const contentType = res.getHeader('content-type')
      if (typeof contentType !== 'undefined') {
        for (let k in parsers) {
          const v = parsers[k]

          if (contentType.indexOf(k) === 0) {
            processors.push(v(serverConfig)(req, res))
          }
        }
      }

      if (processors.length) {
        // Strip off the content length since it will change
        res.removeHeader('content-length')

        // Force charset to utf8
        let charset = getCharset(contentType)

        if (contentType && charset) {
          res.setHeader('content-type', contentType.replace(charset, ('utf8')))
        }

        if (charset && charset !== 'utf8') {
          if (iconv.encodingExists(charset)) {
            processors.push(iconv.decodeStream(charset))
          }
        }

        // Gunzip response if Gziped
        const contentEncoding = res.getHeader('content-encoding')
        if (contentEncoding && contentEncoding.toLowerCase() === 'gzip') {
          // Strip off the content encoding since it will change.
          res.removeHeader('content-encoding')

          const gunzip = zlib.createGunzip()
          processors.unshift(gunzip)
        }
      }

      // Create multipipe stream
      pr = pipe(...processors)

      pr.on('data', (data, encoding) => {
        write.call(res, data, encoding)
      })

      pr.on('end', (data, encoding) => {
        end.call(res, data, encoding)
      })

      return pr
    }

    res.writeHead = function newWriteHead () {
      loadPr()
      writeHead.apply(this, arguments)
    }

    res.write = (data, encoding) => {
      const pr = loadPr()
      pr.write(data, encoding)
    }

    res.end = (data, encoding) => {
      const pr = loadPr()
      pr.end(data, encoding)
    }

    next()
  }
}
