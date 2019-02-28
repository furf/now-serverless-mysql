const url = require('url')
const sql = require('sql-template-strings')
const db = require('../../db')

module.exports = async (req, res) => {
  const { query } = url.parse(req.url, true)
  const users = await db.query(sql`
    SELECT *
    FROM users
    WHERE id = ${query.id}
  `)
  res.end(JSON.stringify({
    user: users[0],
  }))
}
