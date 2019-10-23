require('dotenv').config()

const Hapi = require('@hapi/hapi')
const config = require('getconfig')
const path = require('path')
const Kafka = require('no-kafka')
const WebSocket = require('ws')
const pack = require('./package')
const createLogger = require('./src/logger')

const logger = createLogger('server')
const IS_DEV = config.getconfig.isDev
const IS_PROD = !IS_DEV

const kafkaConfig = {
  clientId: 'kafka-producer',
  connectionString: config.kafka.url
}
logger.info('Kafka config', JSON.stringify(kafkaConfig))
const kafkaProducer = new Kafka.Producer(kafkaConfig)

const hapiConfig = Object.assign({}, config.hapi)
if (IS_DEV) {
  // getUserMedia requires https on all non-localhost domains so if we're testing
  // locally on our local ip then we need local certificates
  // openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
  hapiConfig.tls =
    config.hapi.host !== 'localhost'
      ? {
          key: require('fs').readFileSync('key.pem'),
          cert: require('fs').readFileSync('cert.pem')
        }
      : null
} else {
  // In production all client stuff is served built from the /dist directory
  hapiConfig.files = {
    relativeTo: path.join(__dirname, 'dist')
  }
}
logger.info('Hapi config', JSON.stringify(hapiConfig))
const server = new Hapi.Server(hapiConfig)
const wsServer = new WebSocket.Server({ server: server.listener })

async function start() {
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
    server.ext({
      type: 'onPreResponse',
      method: (request, h) => {
        // In production serve the index.html file for all 404s all the client
        // will display 404s
        if (
          request.response.isBoom &&
          request.response.output.statusCode === 404
        ) {
          return h.file('index.html').code(404)
        }

        return h.continue
      }
    })
  }

  await kafkaProducer.init()
  wsServer.on('connection', (ws) => {
    ws.on('message', (message) => {
      logger.info('Send kafka message', config.kafka.submissionTopic, message)
      kafkaProducer.send({
        topic: config.kafka.submissionTopic,
        message: {
          value: message
        },
        partition: 0
      })
    })
  })

  await server.register(require('@hapi/inert'))
  await server.register({
    plugin: require('hapi-pino'),
    options: {
      prettyPrint: IS_DEV
    }
  })

  const routes = require('./src/routes')
  if (IS_PROD) {
    // In production, also add the actual route that will serve the static files
    routes.push({
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: '.',
          index: true
        }
      }
    })
  }
  server.route(routes)

  server.start()
  logger.info('Server running at:', server.info.uri)
}

try {
  start()
} catch (e) {
  logger.error(e)
}
