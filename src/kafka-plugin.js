const config = require('getconfig')
const Kafka = require('no-kafka')

const register = async (server, options) => {
  const kafkaConfig = options
  server.logger().info(kafkaConfig)
  const kafkaProducer = new Kafka.Producer(kafkaConfig)

  await kafkaProducer.init()

  const sendTopic = (data) => {
    const message = JSON.stringify(data)
    server
      .logger()
      .info(Object.assign({ topic: config.kafka.submissionTopic }, data))
    kafkaProducer.send({
      topic: config.kafka.submissionTopic,
      message: {
        value: message
      },
      partition: 0
    })
  }

  server.expose('send', sendTopic)
}

exports.plugin = {
  name: 'kafka',
  once: true,
  register
}
