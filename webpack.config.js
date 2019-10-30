const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const isDev = process.env.NODE_ENV !== 'production'

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
      title: 'Pure Heroku Demo',
      template: 'app/index.html',
      favicon: 'app/images/favicon.ico'
    }),
    new webpack.DefinePlugin({
      'process.env.LANDIAN_SHUFFLE': JSON.stringify(landians)
    }),
    !isDev && new CleanWebpackPlugin()
  ].filter(Boolean)
}
