const controllers = require('./controllers')

module.exports = [
  {
    method: 'POST',
    path: '/api/submit',
    config: controllers.submit
  },
  {
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
        redirectToSlash: true,
        index: true
      }
    }
  }
]
