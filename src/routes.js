const controllers = require('./controllers')

module.exports = [
  {
    method: 'POST',
    path: '/api/submit',
    config: controllers.submit
  }
]
