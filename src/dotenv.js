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

  let config
  try {
    config = JSON.parse(
      require('child_process')
        .execSync(
          `curl -n -o - https://api.heroku.com/apps/${SERVER_APP_NAME}/config-vars \
            -H "Accept: application/vnd.heroku+json; version=3" \
            -H "authorization: Bearer ${HEROKU_TOKEN}"`,
          { stdio: 'pipe' }
        )
        .toString()
    )
  } catch (e) {
    throw new Error(
      `Failed to get ${SERVER_APP_NAME} config vars via curl\n${e.stderr.toString()}`
    )
  }

  if (config.id) {
    throw new Error(`Heroku API Error: ${config.id} - ${config.message}`)
  }

  Object.keys(config).forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      // Use console.log for this since this file has to be required first so we
      // dont have any loggers set up yet
      // eslint-disable-next-line no-console
      console.log(`Setting env var for ${key} from ${SERVER_APP_NAME}`)
      process.env[key] = config[key]
    }
  })
} else {
  // In development the module dotenv is used to read from the .env file to make
  // restarting the server faster
  require('dotenv').config()
}
