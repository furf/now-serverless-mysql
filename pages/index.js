import fetch from 'isomorphic-unfetch'
import Head from 'next/head'
import Link from 'next/link'

function HomePage({ users }) {
  return (
    <>
      <Head>
        <title>ZEIT</title>
        <link rel="shortcut icon" href="/static/favicon.ico"></link>
      </Head>
      <h1>ZEIT</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <Link prefetch href={`/user?id=${user.id}`}>
              <a>{user.name}</a>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

HomePage.getInitialProps = async ({ req }) => {
  const host = req ? `https://${req.headers.host}` : ''
  const res = await fetch(`${host}/api/users`)
  const json = await res.json()
  return json
}

export default HomePage
