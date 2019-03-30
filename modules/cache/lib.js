const crypto = require('crypto')
const loki = require('lokijs')

let db

module.exports = {
  getHashDirName: (hash) => {
    return hash.slice(0, 3)
  },

  hashFor: (path, method) => {
    const hash = crypto.createHash('sha256')
    hash.update([ method, path ].join(''))
    return hash.digest('hex')
  },

  getHashsDb: (dbPath) => {
    return new Promise((resolve) => {
      // In memory store, save on disk every 4 seconds
      db = new loki(dbPath, {
        autoload: true,
        autosave: true,
        autosaveInterval: 4000,
        autoloadCallback: () => {
          hashsDb = db.getCollection('hashs')

          if (!hashsDb) {
            hashsDb = db.addCollection('hashs')
          }

          return resolve(hashsDb)
        }
      })
    })
  }
}
