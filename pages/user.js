import fetch from 'isomorphic-unfetch'
import Head from 'next/head'
import Link from 'next/link'

function UserPage({ user }) {
  return (
    <>
      <Head>
        <title>ZEIT / {user.name}</title>
        <link rel="shortcut icon" href="/static/favicon.ico"></link>
      </Head>
      <h1>{user.name}</h1>
      <p>
        Follow <a href={`https://twitter.com/${user.twitter}`}>@{user.twitter}</a> on Twitter
      </p>
      <hr/>
      <Link prefetch href="/">
        <a>← Back to users</a>
      </Link>
    </>
  )
}

UserPage.getInitialProps = async ({ req, query }) => {
  const host = req ? `https://${req.headers.host}` : ''
  const res = await fetch(`${host}/api/users/${query.id}`)
  const json = await res.json()
  return json
}

export default UserPage
