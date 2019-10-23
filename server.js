require('dotenv').config()

const Hapi = require('@hapi/hapi')
const config = require('getconfig')
const path = require('path')
const Kafka = require('no-kafka')
const WebSocket = require('ws')
const webpack = require('webpack')
const pack = require('./package')
const webpackPlugin = require('./src/hapi-webpack')
const createLogger = require('./src/logger')

const logger = createLogger('server')

const kafkaConfig = {
  clientId: 'kafka-producer',
  connectionString: config.kafka.url
}
logger.info('Kafka config', JSON.stringify(kafkaConfig))
const kafkaProducer = new Kafka.Producer(kafkaConfig)

const hapiConfig = Object.assign(
  {
    tls:
      // getUserMedia requires https on all non-localhost domains so if we're testing
      // locally on our local ip then we need local certificates
      // openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
      config.getconfig.isDev && config.hapi.host !== 'localhost'
        ? {
            key: require('fs').readFileSync('key.pem'),
            cert: require('fs').readFileSync('cert.pem')
          }
        : null,
    routes: {
      files: config.getconfig.isDev
        ? {}
        : {
            relativeTo: path.join(__dirname, 'dist')
          }
    }
  },
  config.hapi
)
logger.info('Hapi config', JSON.stringify(hapiConfig))
const server = new Hapi.Server(hapiConfig)
const wsServer = new WebSocket.Server({ server: server.listener })

async function start() {
  if (config.getconfig.isDev) {
    await server.register({
      plugin: webpackPlugin,
      options: {
        compiler: webpack(require('./webpack.config.js')),
        dev: {
          publicPath: '/'
        },
        hot: {
          name: pack.name
        }
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
      prettyPrint: config.getconfig.isDev
    }
  })
  server.route(require('./src/routes'))

  server.start()
  logger.info('Server running at:', server.info.uri)
}

try {
  start()
} catch (e) {
  logger.error(e)
}
