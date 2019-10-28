const path = require('path')

const register = async (server, options) => {
  const { directoryPath } = options

  server.logger().info(options)

  // Add static plugin
  await server.register(require('@hapi/inert'))

  // Also add the actual route that will serve the static files
  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: directoryPath,
        index: true
      }
    }
  })

  // Serve the index.html file for all 404s all the client will display 404s
  server.ext({
    type: 'onPreResponse',
    method: (request, h) => {
      if (
        request.response.isBoom &&
        request.response.output.statusCode === 404
      ) {
        request.logger.info('Fallback to index for %s', request.path)
        return h.file(path.join(directoryPath, 'index.html')).code(404)
      }

      return h.continue
    }
  })
}

exports.plugin = {
  name: 'static',
  once: true,
  register
}
