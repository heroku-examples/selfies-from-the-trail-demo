const config = require('getconfig')
const controllers = require('./controllers')

module.exports = [
  {
    method: 'POST',
    path: '/api/submit',
    config: controllers.submit
  },
  config.getconfig.isDev
    ? null
    : {
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
].filter(Boolean)
