const fs = require('fs')
const mkdirp = require('mkdirp')
const lib = require('./lib')

const saveToCache = require('./save')
const retreiveFromCache = require('./retreive')

module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  // Create tmp cache dir
  const cacheDir = moduleConfig.path || './tmp/cache'
  const dataDir = moduleConfig.path || './tmp/cache/data'
  mkdirp.sync(cacheDir)
  mkdirp.sync(dataDir)

  // Load db
  const dbPath = cacheDir + '/data.db'
  let db
  lib.getHashsDb(dbPath).then((hDb) => {
    db = hDb
  })

  return (req, res, next) => {
    // Wait for db initalization
    if (!db) {
      return next()
    }

    // Create hash of method-url
    const hash = lib.hashFor(req.url, req.method)

    // Try to find a record
    const records = db.chain().find({ hash }).simplesort('createdAt').data()

    if (!records.length) {
      // Save response data on disk
      return saveToCache({ dataDir, db })(req, res, next)
    }

    // Get last record
    const record = records[records.length - 1]

    // Check record expiration
    const now = +new Date()
    if (now >= record.expireAt) {
      // If cache data expired, save response data
      return saveToCache({ dataDir, db })(req, res, next)
    }

    // Check response is not currently in saving / error state
    if (record.state !== 'ok') {
      return saveToCache({ dataDir, db })(req, res, next)
    }

    retreiveFromCache({ dataDir, db, record })(req, res, next)
  }
}
