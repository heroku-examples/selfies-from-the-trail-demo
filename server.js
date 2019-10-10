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

const kafkaProducer = new Kafka.Producer({
  connectionString: config.kafka.url
})

const server = new Hapi.Server(
  Object.assign(
    {
      routes: {
        files: {
          relativeTo: path.join(__dirname, 'public')
        }
      }
    },
    config.hapi
  )
)

const wsServerConfig = { port: config.hapi.port + 1 }
const wsServer = new WebSocket.Server(wsServerConfig)
logger.info('ws server config', wsServerConfig)

async function start() {
  await server.register({
    plugin: webpackPlugin,
    options: {
      compiler: webpack(require('./webpack.config.js')),
      dev: {
        // See https://github.com/webpack/webpack-dev-middleware
        historyApiFallback: true,
        methods: ['GET'],
        index: 'index.html',
        publicPath: '/',
        quiet: false
      },
      hot: {
        // See https://github.com/glenjamin/webpack-hot-middleware
        name: pack.name
      }
    }
  })

  await kafkaProducer.init()
  wsServer.on('connection', (ws) => {
    ws.on('message', (message) => {
      logger.info('send kafka message', config.kafka.submissionTopic, message)
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
  server.route(require('./src/routes'))

  server.start()
  logger.info('Server running at:', server.info.uri)
}

try {
  start()
} catch (e) {
  logger.error(e)
}
