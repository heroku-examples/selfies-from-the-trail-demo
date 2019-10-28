require('./src/dotenv')

const Hapi = require('@hapi/hapi')
const config = require('getconfig')
const pack = require('./package')

const IS_DEV = config.getconfig.isDev

const start = async () => {
  const hapiConfig = Object.assign({}, config.hapi)

  if (config.useLocalCerts && hapiConfig.host !== 'localhost') {
    // getUserMedia requires https on all non-localhost domains so if we're testing
    // locally on our local ip then we need local certificates. You can generate key files with:
    // openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
    hapiConfig.tls = {
      key: require('fs').readFileSync('key.pem'),
      cert: require('fs').readFileSync('cert.pem')
    }
  }

  const server = new Hapi.Server(hapiConfig)

  await server.register({
    plugin: require('hapi-pino'),
    options: {
      prettyPrint: IS_DEV,
      redact: ['tls.cert', 'tls.key']
    }
  })

  server.log(['start'], hapiConfig)

  if (IS_DEV) {
    await server.register({
      plugin: require('./src/hapi-webpack'),
      options: {
        dev: {
          publicPath: '/'
        },
        hot: {
          name: pack.name
        }
      }
    })
  } else {
    // Static files are only need in production
    // This plugin will register routes and responses to serve all client files
    // from the built webpack directory and also serve the index for all 404s
    await server.register({
      plugin: require('./src/static-plugin'),
      options: {
        directoryPath: 'dist'
      }
    })
  }

  await server.register({
    plugin: require('./src/kafka-plugin'),
    options: {
      clientId: 'kafka-producer',
      connectionString: config.kafka.url
    }
  })

  server.state('data', {
    encoding: 'base64json',
    isSecure: false,
    isHttpOnly: false,
    isSameSite: false,
    path: '/',
    ttl: 86400000
  })

  server.route(require('./src/routes'))

  server.start()
  server.log(['start'], server.info.uri)
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
})
