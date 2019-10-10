const controllers = require('./controllers')

module.exports = [
  {
    method: 'GET',
    path: '/api/test',
    config: controllers.index
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
