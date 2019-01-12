const crypto = require('crypto')
const maxmind = require('maxmind')

module.exports = (serverConfig, moduleConfig = {}) => {
  const contryLookup = maxmind.openSync('./geolite2/GeoLite2-Country.mmdb')
  const users = {}

  setInterval(() => {
    console.log(getStats(users))
  }, 1000)

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null)
    const agent = req.headers['user-agent']
    const hash = crypto.createHash('sha256').update(ip, 'utf8').update(agent, 'utf8').digest('hex')

    users[hash] = users[hash] || { hits: 0 }
    users[hash].hits++
    users[hash].origin = contryLookup.get(ip)

    return next()
  }
}

function getStats (users) {
  const stats = {
    users: 0,
    hits: 0,
    countryUsers: {},
    countryHits: {}
  }

  for (var u in users) {
    const user = users[u]
    stats.users++
    stats.hits += user.hits
    if (user.origin) {
      stats.countryUsers[user.origin] = stats.countryUsers[user.origin] || 0
      stats.countryUsers[user.origin]++

      stats.countryHits[user.origin] = stats.countryHits[user.origin] || 0
      stats.countryHits[user.origin] += user.hits
    }
  }
  return stats
}
