const db = require('../../db')

module.exports = async (req, res) => {
  const users = await db.query(`
    SELECT *
    FROM users
  `)
  res.end(JSON.stringify({ users }))
}
