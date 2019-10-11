const webpack = require('webpack')
const config = require('getconfig')

const isDev = config.getconfig.isDev

module.exports = {
  entry: {
    app: ['./app/index.js', isDev && 'webpack-hot-middleware/client'].filter(
      Boolean
    )
  },
  mode: isDev ? 'development' : 'production',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        exclude: /node_modules/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: '[hash]-[name].[ext]'
        }
      }
    ]
  },
  plugins: [isDev && new webpack.HotModuleReplacementPlugin()].filter(Boolean)
}
