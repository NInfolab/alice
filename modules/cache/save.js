const fs = require('fs')
const mkdirp = require('mkdirp')
const lib = require('./lib')

module.exports = ({ dataDir, db }) => (req, res, next) => {
  const hash = lib.hashFor(req.url, req.method)
  const now = +new Date()
  const records = db.chain().find({ hash }).simplesort('createdAt').data()
  let record

  if (records.length) {
    record = records[records.length - 1]
  }

  if (record) {
    if (now <= record.expireAt) {
      // Proxy
      return next()
    }
  }

  if (record && record.state === 'saving') {
    // Proxy
    return next()
  }

  // Set expiration @TODO: from headers
  let expireAt = (+ new Date()) + (300 * 1000) // Default 5 minutes (timestamp in ms)

  const hashDirName = lib.getHashDirName(hash)
  const fileName = [hash, expireAt].join('-')
  const path = [hashDirName, fileName].join('/')

  record = db.insert({
    hash,
    expireAt,
    path,
    createdAt: +new Date(),
    state: 'saving',
  })

  // Create fs write stream
  const outDir = [dataDir, hashDirName].join('/')
  const outFile = [outDir, fileName].join('/')
  mkdirp.sync(outDir)
  const writeStream = fs.createWriteStream(outFile)

  const { write, end } = res

  // @TODO: dont work, data registered are not transformed

  res.write = (data, encoding) => {
    writeStream.write(data, encoding)
    write.call(this, data, encoding)
  }

  res.end = (data, encoding) => {
    writeStream.end(data, encoding)
    end.call(this, data, encoding)

    // Update record
    record.state = 'ok'
    db.update(record)
  }

  //res.on('error', () => {
    //record.state = 'error'
    //db.update(record)
  //})

  next()
}
