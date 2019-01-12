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
    const location = contryLookup.get(ip)

    users[hash] = users[hash] || { hits: 0 }
    users[hash].hits++
    if (location && location.country) {
      users[hash].country = location.country.iso_code
    }
    if (location && location.continent) {
      users[hash].continent = location.continent.code
    }

    return next()
  }
}

function getStats (users) {
  const stats = {
    users: 0,
    hits: 0,
    countryUsers: {},
    countryHits: {},
    continentUsers: {},
    continentHits: {}
  }

  for (var u in users) {
    const user = users[u]
    stats.users++
    stats.hits += user.hits

    if (user.country) {
      stats.countryUsers[user.country] = stats.countryUsers[user.country] || 0
      stats.countryUsers[user.country]++

      stats.countryHits[user.country] = stats.countryHits[user.country] || 0
      stats.countryHits[user.country] += user.hits
    }

    if (user.continent) {
      stats.continentUsers[user.continent] = stats.continentUsers[user.continent] || 0
      stats.continentUsers[user.continent]++

      stats.continentHits[user.continent] = stats.continentHits[user.continent] || 0
      stats.continentHits[user.continent] += user.hits
    }
  }
  return stats
}
