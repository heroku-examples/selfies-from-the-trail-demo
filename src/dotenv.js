const { execSync } = require('child_process')

const curl = (...cmds) =>
  JSON.parse(
    execSync(`curl -n -o - ${cmds.join(' \\\n')}`, { stdio: 'pipe' }).toString()
  )

const herokuCurl = ({ endpoint = '', appName, token }) => {
  let res

  try {
    res = curl(
      `https://api.heroku.com/apps/${appName}/${endpoint}`,
      `-H "Accept: application/vnd.heroku+json; version=3"`,
      `-H "authorization: Bearer ${token}"`
    )
  } catch (e) {
    throw new Error(
      `Failed to get ${appName} config vars via curl\n${e.stderr.toString()}`
    )
  }

  if (res.id && res.message) {
    throw new Error(`Heroku API Error: ${res.id} - ${res.message}`)
  }

  return res
}

// Use console.log for this since this file has to be required first so we
// dont have any loggers set up yet
// eslint-disable-next-line no-console
const log = console.log

if (process.env.NODE_ENV === 'production') {
  // To make this app easier to setup, in production the only env vars it needs to be bootstrapped
  // with are the name of a heroku app and a token that can be used to fetch all
  // the env vars from that app and set them for this one.
  const { SERVER_APP_NAME, HEROKU_TOKEN } = process.env

  if (!SERVER_APP_NAME || !HEROKU_TOKEN) {
    throw new Error(
      `SERVER_APP_NAME and HEROKU_TOKEN env vars are required for this app.`
    )
  }

  const { web_url } = herokuCurl({
    appName: SERVER_APP_NAME,
    token: HEROKU_TOKEN
  })

  const serverAppStatusUrl = `${web_url}api/send-attendee-status`
  try {
    const status = curl(`-X POST ${serverAppStatusUrl}`)
    log(`POSTing to ${serverAppStatusUrl} - ${JSON.stringify(status)}`)
  } catch (e) {
    log(`Could not POST to ${serverAppStatusUrl} - ${e.message}`)
  }

  const config = herokuCurl({
    appName: SERVER_APP_NAME,
    token: HEROKU_TOKEN,
    endpoint: 'config-vars'
  })

  Object.keys(config).forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      log(`Setting env var for ${key} from ${SERVER_APP_NAME}`)
      process.env[key] = config[key]
    }
  })
} else {
  // In development the module dotenv is used to read from the .env file to make
  // restarting the server faster
  require('dotenv').config()
}
