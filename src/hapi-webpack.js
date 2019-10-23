const Pack = require('../package.json')
const Path = require('path')
const Webpack = require('webpack')
const WebpackDevMiddleware = require('webpack-dev-middleware')
const WebpackHotMiddleware = require('webpack-hot-middleware')

function register(server, options) {
  // Define variables
  let config = {}
  let compiler

  // Require config from path
  if (typeof options === 'string') {
    const configPath = Path.resolve(process.cwd(), options)
    config = require(configPath)
    compiler = new Webpack(config)
  } else {
    config = options
    compiler = config.compiler
  }

  // Create middlewares
  const webpackDevMiddleware = WebpackDevMiddleware(compiler, config.assets)
  const webpackHotMiddleware = WebpackHotMiddleware(compiler, config.hot)

  // Handle webpackDevMiddleware
  server.ext({
    type: 'onRequest',
    method: async (request, h) => {
      const { req, res } = request.raw

      await new Promise((resolve, reject) => {
        webpackDevMiddleware(req, res, (error) => {
          if (error) reject(error)
          resolve()
        })
      })

      return h.continue
    }
  })

  // Handle webpackHotMiddleware
  server.ext({
    type: 'onRequest',
    method: async (request, h) => {
      const { req, res } = request.raw

      await new Promise((resolve, reject) => {
        webpackHotMiddleware(req, res, (error) => {
          if (error) reject(error)
          resolve()
        })
      })

      return h.continue
    }
  })

  server.ext({
    type: 'onPreResponse',
    method: async (request, h) => {
      // This serves the html webpack plugins build html file for all fallback urls
      if (
        // Skip non-404 errors since those are probably errors in api routes
        (request.response.isBoom &&
          request.response.output.statusCode !== 404) ||
        // Skip routes that are already a fallback path
        (request.route && request.route.path !== '/{p*}')
      ) {
        return h.continue
      }

      const filename = Path.join(compiler.outputPath, 'index.html')
      const result = await new Promise((resolve, reject) => {
        compiler.outputFileSystem.readFile(filename, (error, res) => {
          if (error) reject(error)
          resolve(res)
        })
      })

      return h.response(result).type('text/html')
    }
  })

  // Expose compiler
  server.expose({ compiler })
}

exports.plugin = {
  pkg: Pack,
  once: true,
  register
}
