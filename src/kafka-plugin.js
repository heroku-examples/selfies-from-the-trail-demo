const config = require('getconfig')
const Kafka = require('no-kafka')

const register = async (server, options) => {
  const kafkaConfig = options
  server.log(['kafka'], kafkaConfig)

  const kafkaProducer = new Kafka.Producer(kafkaConfig)
  await kafkaProducer.init()

  server.expose('sendSubmission', (data) => {
    server.log(['kafka', config.kafka.submissionTopic], data)
    kafkaProducer.send({
      topic: config.kafka.submissionTopic,
      message: {
        value: JSON.stringify(data)
      },
      partition: 0
    })
  })

  server.expose('changeBackground', () => {
    server.log(['kafka', config.kafka.backgroundTopic])
    kafkaProducer.send({
      topic: config.kafka.backgroundTopic,
      message: {
        value: ''
      },
      partition: 0
    })
  })
}

exports.plugin = {
  name: 'kafka',
  once: true,
  register
}
