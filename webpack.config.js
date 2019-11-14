const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const config = require('getconfig')
const { isDev } = config.getconfig

const CLIENT_CONFIG_KEYS = ['twitter.tweet', 'downloadName']

const landians = _.shuffle(
  fs
    .readdirSync('./app/images')
    .filter((v) => v.match(/^landian-\d{2}\.svg/))
    .map((v) => path.basename(v, path.extname(v)))
)

module.exports = {
  output: {
    publicPath: '/'
  },
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
        test: /\.(png|jpe?g|gif|svg|ttf|eot|woff)(\?.*)?$/,
        exclude: /node_modules/,
        loader: 'url-loader',
        options: {
          limit: 0,
          name: '[hash]-[name].[ext]'
        }
      }
    ]
  },
  plugins: [
    isDev && new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: 'Selfies from the Trail',
      template: 'app/index.html',
      favicon: 'app/images/favicon.ico'
    }),
    new webpack.DefinePlugin({
      'process.env.LANDIAN_SHUFFLE': JSON.stringify(landians),
      'process.env.CLIENT_CONFIG': JSON.stringify(
        _.pick(config, ...CLIENT_CONFIG_KEYS)
      )
    }),
    !isDev && new CleanWebpackPlugin()
  ].filter(Boolean)
}
