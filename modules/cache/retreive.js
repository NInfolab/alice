const fs = require('fs')
const lib = require('./lib')

module.exports = ({ dataDir, db, record }) => (req, res, next) => {
  // Create read stream
  const filePath = [dataDir, record.path].join('/')
  const readStream = fs.createReadStream(filePath)

  console.log('::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::')

  // Get data from cache
  // @TODO : handle errors, pipe headers content
  return readStream.pipe(res)
}
