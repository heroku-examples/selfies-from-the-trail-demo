const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  output: {
    publicPath: '/'
  },
  entry: {
    app: ['./app/index.js', !isProd && 'webpack-hot-middleware/client'].filter(
      Boolean
    )
  },
  mode: isProd ? 'production' : 'development',
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
    !isProd && new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: 'Pure Heroku Demo',
      template: 'app/index.html',
      favicon: 'app/images/favicon.ico'
    })
  ].filter(Boolean)
}
