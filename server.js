require('dotenv').config()

const Hapi = require('@hapi/hapi')
const config = require('getconfig')
const path = require('path')
const Kafka = require('no-kafka')
const WebSocket = require('ws')
const pack = require('./package')

const IS_DEV = config.getconfig.isDev
const IS_PROD = !IS_DEV

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

  if (IS_PROD) {
    // In production all client stuff is served built from the /dist directory
    hapiConfig.routes = {
      files: {
        relativeTo: path.join(__dirname, 'dist')
      }
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

  server.logger().info(hapiConfig)

  const wsServer = new WebSocket.Server({ server: server.listener })

  const kafkaConfig = {
    clientId: 'kafka-producer',
    connectionString: config.kafka.url
  }
  server.logger().info(kafkaConfig)
  const kafkaProducer = new Kafka.Producer(kafkaConfig)

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
    await server.register(require('@hapi/inert'))
    // In production, also add the actual route that will serve the static files
    server.route({
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: '.',
          index: true
        }
      }
    })
    server.ext({
      type: 'onPreResponse',
      method: (request, h) => {
        // In production serve the index.html file for all 404s all the client
        // will display 404s
        if (
          request.response.isBoom &&
          request.response.output.statusCode === 404
        ) {
          request.logger.info('Fallback to index for %s', request.path)
          return h.file('index.html').code(404)
        }

        return h.continue
      }
    })
  }

  await kafkaProducer.init()
  wsServer.on('connection', (ws) => {
    ws.on('message', (message) => {
      server
        .logger()
        .info(Object.assign({ topic: config.kafka.submissionTopic }, message))
      kafkaProducer.send({
        topic: config.kafka.submissionTopic,
        message: {
          value: message
        },
        partition: 0
      })
    })
  })

  server.route(require('./src/routes'))

  server.start()
  server.logger().info('Server running at:', server.info.uri)
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
})
