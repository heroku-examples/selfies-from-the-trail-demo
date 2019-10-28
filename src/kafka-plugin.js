const config = require('getconfig')
const Kafka = require('no-kafka')

const register = async (server, options) => {
  const kafkaConfig = options
  server.log(['kafka'], kafkaConfig)

  const kafkaProducer = new Kafka.Producer(kafkaConfig)
  await kafkaProducer.init()

  const sendTopic = (data) => {
    server.log(['kafka', config.kafka.submissionTopic], data)
    kafkaProducer.send({
      topic: config.kafka.submissionTopic,
      message: {
        value: JSON.stringify(data)
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
