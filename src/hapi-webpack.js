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

  // Expose compiler
  server.expose({ compiler })
}

exports.plugin = {
  pkg: Pack,
  once: true,
  register
}
