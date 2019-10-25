const controllers = require('./controllers')

module.exports = [
  // TODO: add route for saving image to s3 and producing kafka event
  // and use public url of image to share to twitter
  {
    method: 'POST',
    path: '/api/submit',
    config: controllers.submit
  }
]
