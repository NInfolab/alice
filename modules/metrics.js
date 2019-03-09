const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const maxmind = require('maxmind')
const moment = require('moment')

module.exports = (proxy, serverConfig, moduleConfig = {}) => {
  const contryLookup = maxmind.openSync('./lib/geolite2/GeoLite2-Country.mmdb')
  let users = {}
  let stats = {}

  const metricsDir = moduleConfig.path || './metrics'
  const statsFile = path.resolve(path.join(metricsDir, 'stats.json'))
  const usersFile = path.resolve(path.join(metricsDir, 'users.json'))

  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir)
  }
  if (fs.existsSync(statsFile)) {
    stats = require(statsFile)
    // Crash if users file have been deleted and not stats
    // This prevent unwanted stats file overide
    users = require(usersFile)
  }

  // Save state at a regular interval
  setInterval(() => {
    const d = new Date()
    const my = (d.getUTCMonth() + 1) + '-' + d.getUTCFullYear()
    stats[my] = getStats(users)

    // Persist state
    fs.writeFileSync(statsFile, JSON.stringify(stats))
    fs.writeFileSync(usersFile, JSON.stringify(users))
  }, 1000)

  return (req, res, next) => {
    if (req.url === '/alice-stats') {
      let d = new Date()
      let m = d.getUTCMonth() + 1
      let y = d.getUTCFullYear()

      let bodyMonth = ''
      for (; y > 2018; y--) { // Search for data until 2018
        for (; m > 0; m--) {
          const my = m + '-' + y
          if (stats[my]) {
            const s = stats[my]
            const style = 'border: 1px solid;'

            // Build countries table
            var countries = `<tr>
              <th style="${style}">Country</th>
              <th style="${style}">Unique visitors</th>
              <th style="${style}">Hits</th>
            </tr>`
            for (var country in s.countries) {
              countries += `<tr>
                <td style="${style}">${country}</td>
                <td style="${style}">${s.countries[country].users}</td>
                <td style="${style}">${s.countries[country].hits}</td>
              </tr>`
            }

            // Build continent table
            var continents = `<tr>
              <th style="${style}">Continent</th>
              <th style="${style}">Unique visitors</th>
              <th style="${style}">Hits</th>
            </tr>`
            for (var continent in s.continents) {
              continents += `<tr>
                <td style="${style}">${continent}</td>
                <td style="${style}">${s.continents[continent].users}</td>
                <td style="${style}">${s.continents[continent].hits}</td>
              </tr>`
            }
            d.setUTCMonth(m - 1)
            d.setUTCFullYear(y)
            bodyMonth += `<h2>${moment(d).format('MMMM YYYY')}</h2>
              <p><b>Unique visitors:</b> ${s.users}<br /><b>Hits:</b> ${s.users}</p>
              <div style="display: flex; justify-content: space-around">
                <table style="width: 40%; ${style}">${countries}</table>
                <table style="width: 40%; ${style}">${continents}</table>
              </div>`
          }
        }
        m = 12
      }

      res.writeHead(200, { 'Content-Type': 'text/html' })

      let body = `<html><body><h1>Alice Stats</h1>${bodyMonth}</body></html>`
      res.end(body)
      return
    }

    const { writeHead } = res
    res.writeHead = function (code, headers) {
      const contentType = this.getHeader('content-type')
      // Only count html hit
      if (!contentType || (contentType && !contentType.match('html/*'))) {
        return writeHead.apply(res, arguments)
      }

      const ip = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : '')
      const agent = req.headers['user-agent'] || ''
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

      return writeHead.apply(res, arguments)
    }

    return next()
  }
}

function getStats (users) {
  const stats = {
    users: 0,
    hits: 0,
    countries: {},
    continents: {}
  }

  for (var u in users) {
    const user = users[u]
    stats.users++
    stats.hits += user.hits

    if (user.country) {
      stats.countries[user.country] = stats.countries[user.country] || { users: 0, hits: 0 }
      stats.countries[user.country].users++
      stats.countries[user.country].hits += user.hits
    }

    if (user.continent) {
      stats.continents[user.continent] = stats.continents[user.continent] || { users: 0, hits: 0 }
      stats.continents[user.continent].users++
      stats.continents[user.continent].hits += user.hits
    }
  }
  return stats
}
