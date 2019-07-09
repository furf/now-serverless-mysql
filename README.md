# Deploy Serverless MySQL with Now

https://github.com/zeit/docs/blob/master/contributing.md#guides

[Serverless MySQL](https://github.com/jeremydaly/serverless-mysql) is, according to its author, "a module for managing [MySQL](https://www.mysql.com/) connections at [serverless](https://en.wikipedia.org/wiki/Serverless_computing) scale." More specifically, `serverless-mysql` is a lightweight Node.js module that wraps the popular [`mysql`](https://github.com/mysqljs/mysql) module, adding connection monitoring and management to allow thousands of concurrent executions in a serverless application.

In this guide, we will demonstrate how to set up a basic serverless web application using [Next.js](https://nextjs.org/) and Serverless MySQL, and deploy it with [ZEIT Now](https://zeit.co/docs/v2/).

> Before we proceed, it may be helpful to acknowledge why you can't use `serverless-mysql` directly from within a universal Next.js application. The module depends on native Node.js modules, including [`fs`](https://nodejs.org/dist/latest-v10.x/docs/api/fs.html), [`net`](https://nodejs.org/dist/latest-v10.x/docs/api/net.html), and [`tls`](https://nodejs.org/dist/latest-v10.x/docs/api/tls.html), which are unavailable to the browser. This means that your application will render pages initially, with server-side rendering (SSR), but will subsequently fail to render in the browser. The solution, however, is rather straightforward, requires only a small additional effort and provides better security, performance and an opportunity to show off more of Now's impressive capability. This guide will demonstrate how to create a monorepo to house and deploy both a Next.js application and a serverless API that will be accessible to your application both on the server and in the browser.
>

## Step 0: Before You Get Started

This guide requires that you have [Node.js](https://nodejs.org/en/download/) and the [Now CLI](https://github.com/zeit/now-cli) installed on your local development machine and that you have [an active ZEIT account](https://zeit.co/onboarding).

### Set Up the Database

This guide also presupposes that you have a MySQL database hosted remotely. In order for your Serverless API to query the database, you will need to authorize requests from ZEIT's IP address(es).

The demo application displays a directory of ZEIT employees. Here is an SQL file of sample data:

_zeit.sql_

```mysql
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `twitter` varchar(15) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;

LOCK TABLES `users` WRITE;

INSERT INTO `users` VALUES
  (null,'Guillermo Rauch','rauchg'),
  (null,'Naoyuki Kanezawa','nkzawa'),
  (null,'Olli Vanhoja','OVanhoja'),
  (null,'Evil Rabbit','evilrabbit_'),
  (null,'Leo Lamprecht','notquiteleo'),
  (null,'Igor Klopov','iklopov'),
  (null,'Nathan Rajlich','tootallnate'),
  (null,'Arunoda Susiripala','arunoda'),
  (null,'Matheus Fernandes','matheusfrndes'),
  (null,'Javi Velasco','javivelasco'),
  (null,'Tim Neutkens','timneutkens'),
  (null,'Timothy Lorimer','timothyis_'),
  (null,'Shu Ding','quietshu'),
  (null,'Max Rovensky','MaxRovensky'),
  (null,'Harrison Harnisch','hjharnis'),
  (null,'Connor Davis','connordav_is');

UNLOCK TABLES;
```

If you have shell access to your database server, you can import the data from the command line.

```shell
$ mysql -u demo -p zeit < zeit.sql
```

## Step 1: Set Up the Project

Create a directory and initialize your project with [npm](https://www.npmjs.com/get-npm). (You can alternatively use [Yarn](https://yarnpkg.com/en/docs/install).)

```shell
$ mkdir now-serverless-mysql && cd now-serverless-mysql
$ npm init -y
```

### Configure the Deployment

All Now deployments require the use of a `now.json` [configuration file](https://zeit.co/docs/v2/deployments/configuration/). This file describes how your project (and its parts) should be built and deployed on the Now platform.

_now.json_

```json
{
  "version": 2,
  "name": "now-serverless-mysql",
  "builds": [
    { "src": "api/**/*.js", "use": "@now/node" }
  ]
}
```

#### Understanding the Configuration File

- The [version](https://zeit.co/docs/v2/deployments/configuration/#version) property instructs Now to deploy the application using the latest [v2 version](https://zeit.co/docs/v2/platform/overview/) of the Now Platform.
- The [name](https://zeit.co/docs/v2/deployments/configuration/#name) property instructs Now to organize all deployments and prefix all deployment instances using `now-serverless-mysql`. 
- The [builds](https://zeit.co/docs/v2/deployments/configuration/#builds) property instructs Now to build all `.js` files found within the `api` directory using the [Node.js builder](https://zeit.co/docs/v2/deployments/official-builders/node-js-now-node/)

## Step 2: Create the Serverless API

### Install the Dependencies

Add the `serverless-mysql` module to your project.

```shell
$ npm install --save-exact serverless-mysql
```

### Connect to the Database

Since you're likely to create more than one endpoint that will use your database connection, it is sensible to create a reusable interface. This example uses configuration parameters that are provided to the application using [environment variables](https://zeit.co/docs/v2/deployments/environment-variables-and-secrets/). There are a [other](https://www.npmjs.com/package/dotenv) [ways](https://www.npmjs.com/package/cross-env) to provide environment variables to a Node.js application, but we will [populate them using the Now CLI](https://zeit.co/blog/environment-variables-secrets) when we deploy the API.

_db.js_

```js
const mysql = require('serverless-mysql')

const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  },
})

exports.query = async (query) => {
  try {
    const results = await db.query(query)
    await db.end()
    return results
  } catch (error) {
    return { error }
  }
}
```

### Create the API Endpoints

Each endpoint is deployed and served as a serverless function, or [Lambda](https://zeit.co/docs/v2/deployments/concepts/lambdas/). To handle HTTP requests, your module should export an [asynchronous function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) capable of handling two arguments, [request](https://nodejs.org/api/http.html#http_event_request) and [response](https://nodejs.org/api/http.html#http_class_http_serverresponse).

In the first `users` endpoint, we perform a simple query using our database abstraction and return the results as JSON. The following endpoint will be available as `/api/users` in our deployment.

_api/users/index.js_

```js
const db = require('../../db')

module.exports = async (req, res) => {
  const users = await db.query(`
    SELECT *
    FROM users
  `)
  res.end(JSON.stringify({ users }))
}
```

In the second endpoint, we will parse the URL query and extract the `id` parameter to populate our `user` query. 

_api/users/user.js_

```js
const url = require('url')
const db = require('../../db')

module.exports = async (req, res) => {
  const { query } = url.parse(req.url, true)
  const users = await db.query(`
    SELECT *
    FROM users
    WHERE id = ${query.id}
  `)
  res.end(JSON.stringify({
    user: users[0],
  }))
}

```

### 💡Pro-tip

Before we continue, did you catch the glaring security error in the above code? By passing the user-supplied `id` query string parameter directly into our SQL query, we made our database susceptible to an [SQL injection](https://en.wikipedia.org/wiki/SQL_injection) attack.

![Exploits of a Mom](https://imgs.xkcd.com/comics/exploits_of_a_mom.png)

<center><small>Exploits of a Mom, <a href="https://xkcd.com/327/">xkcd.com</a></small></center>

To prevent this type of attack, we can [use a paramaterized query](https://blogs.msdn.microsoft.com/sqlphp/2008/09/30/how-and-why-to-use-parameterized-queries/). A parameterized query uses placeholders for parameters and supplies escaped values when the query is executed. (This has a side benefit of sparing you from having to escape quotes in your values.)

As with most things in the JavaScript ecosystem, there already exists a module for parameterizing SQL queries. [SQL Template Strings](https://github.com/felixfbecker/node-sql-template-strings) provides a [tag function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates) which will convert your [template literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) SQL statement into an object which can be safely consumed by the `mysql` module.

Dangerous:

```js
console.log(`INSERT INTO Students(Name) VALUES('${studentName}');`);
"INSERT INTO Students(Name) VALUES('Robert'); DROP TABLE Students;--');"
```

Safe:

```js
console.log(sql`INSERT INTO Students(Name) VALUES('${studentName}');`);
{
  sql: 'INSERT INTO Students(Name) VALUES(\'?\');',
  values: [ 'Robert\'); DROP TABLE Students;--' ]
}
```

### Safeguard Your SQL

Add the `sql-template-strings` module to your project.

```shell
$ npm install --save-exact sql-template-strings
```

Import the module into your API endpoint and tag your SQL statement.

_api/users/user.js_

```js
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
```

That's it! The update is so subtle, you might just miss it.

### Add Custom Routing

If we deploy the API as is, our `users` and `user` endpoints would be available at `/api/users` and `/api/users/user.js?id=$id` respectively. The latter path does not resemble the more familiar [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) format of `/api/users/$id`. Fortunately, Now supports [custom routing](https://zeit.co/docs/v2/deployments/routes) with [route parameters](https://zeit.co/docs/v2/deployments/routes/#route-parameters) that we can use to modify our route with a single-line change to our Now configuration file.

_now.json_

```json
{
  "routes": [
    { "src": "/api/users/(?<id>[^/]*)", "dest": "api/users/user.js?id=$id"}
  ]
}  
```

The [routes](https://zeit.co/docs/v2/deployments/configuration/#routes) property instructs Now to redirect all HTTP requests from a custom `src` path to an absolute destination `dest` path, e.g. from `/api/users/1` to `api/users/user.js?id=1`.

### Deploy the API

In your terminal, deploy the API using the Now CLI, passing the environment variables as arguments to the `now` command using the `-e` or `--env` option.

```shell
$ now -e MYSQL_HOST=35.233.224.228 -e MYSQL_DATABASE=zeit -e MYSQL_USER=demo -e MYSQL_PASSWORD=ioB2BA84TVmJ7Dyg
```

You should see output that resembles the following:

```shell
> Deploying ~/src/now-serverless-mysql under furf
> Using project now-serverless-mysql
> Synced 4 files (13.72KB) [1s]
> https://now-serverless-mysql-qzrhvij7s.now.sh [v2] [in clipboard] [2s]
┌ api/users/index.js        Ready               [56s]
└── λ api/users/index.js (129.98KB) [sfo1]
┌ api/users/user.js         Ready               [56s]
└── λ api/users/user.js (129.67KB) [sfo1]
> Success! Deployment ready [1m]
```

The API is now deployed, and the [/api/users](https://now-serverless-mysql-qzrhvij7s.now.sh/api/users) and [/api/users/$id](https://now-serverless-mysql-qzrhvij7s.now.sh/api/users/1) endpoints are now available. 

If you only need an API, you're finished. _Class dismissed!_

However, if you would like to learn how to include your Serverless MySQL API in a functional web application, continue on to the next step where we will demonstrate how to use [`isomorphic-unfetch`](https://github.com/developit/unfetch/tree/master/packages/isomorphic-unfetch) to perform server-side and client-side rendering of MySQL data.

## Step 3: Create Your App

### Install the Dependencies

Add Next.js and other dependencies to your project.

```shell
$ npm install --save-exact next react react-dom isomorphic-unfetch
```

### Update the Deployment Configuration

Before we begin writing code, we will add custom configuration to deploy the app as a serverless Next.js application. Serverless deployment has [numerous benefits](https://zeit.co/blog/serverless-express-js-lambdas-with-now-2#benefits-of-serverless-express) including reliability, scalability, and improved performance.

First, create a `next.config.js` configuration file at the root of the project. This file allows you to enable and [customize advanced behaviors](https://nextjs.org/docs/#custom-configuration) of Next.js.

_next.config.js_

```js
module.exports = {
  target: 'serverless',
}
```

The `target` property instructs Next.js to enable [serverless mode](https://nextjs.org/docs/#custom-configuration) and generate a single lambda per page.

Next, update the `builds` property in the `now.json` configuration to include a [Next.js builder](https://zeit.co/docs/v2/deployments/official-builders/next-js-now-next/) for your app. This following `builds` entry instructs Now to perform a standard Next.js build which will provide server rendering of each file in the `./pages` and static serving of files in the `./static` directory.

_now.json_

```json
{
  "builds": [
    { "src": "next.config.js", "use": "@now/next" }
  ]
}
```

Finally, include a script in our `package.json` named `now-build` that instructs Now how to build the application.

_package.json_

```json
{
  "scripts": {
    "now-build": "next build"
  }
}
```

### Create the Pages

First, create the home page. This page fetches a list of users from the API and renders them in a list.

_pages/index.js_

```jsx
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
```

Note in the `HomePage.getInitialProps` method that the host is determined differently on the server and on the client. In a standard client app, a relative path to the API, e.g. `/api/users`, would suffice. However, when the page renders on the server, there is not a URL to be "relative" to, so it requires an absolute path to the API. Since Now deployments are immutable and the host domain changes with each deployment, the host must be parsed from the HTTP request headers.

Next, create the user detail page. This page fetches user-specific data from the API and renders it.

_pages/user.js_

```jsx
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
```

### Deploy the App

Since typing out environment variables will grow tiresome quickly, add a `deploy` script to the `package.json`  and deploy using the `npm run` command.

_package.json_

```json
{
  "scripts": {
    "deploy": "now -e MYSQL_HOST=35.233.224.228 -e MYSQL_DATABASE=zeit -e MYSQL_USER=demo -e MYSQL_PASSWORD=ioB2BA84TVmJ7Dyg"
  }
}
```


```shell
$ npm run deploy
```

Once you see `Success! Deployment ready`, your app is online and ready.

## Bonus: Alias the Deployment

If everything looks correct, you can promote the deployment to your _Production_ environment.

The `now alias` command [makes a deployment available](https://zeit.co/docs/v2/domains-and-aliases/aliasing-a-deployment/) at one or more `.now.sh` subdomains or custom domains.

```shell
$ now alias now-serverless-mysql.now.sh
```

You can optionally store one or more default target aliases in the Now configuration file and deploy more succinctly. The [alias](https://zeit.co/docs/v2/deployments/configuration/#alias) property instructs Now to use [now-serverless-mysql.now.sh](https://now-serverless-mysql.now.sh) as the default target.

_now.json_

```json
{
  "alias": "now-serverless-mysql.now.sh"
}
```

```shell
$ now alias
```

Congratulations! You just built and deployed a completely serverless application using Serverless MySQL and Now.
