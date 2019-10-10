const webpack = require('webpack')

module.exports = {
  stats: { assets: false },
  entry: {
    app: ['./app/index.js', 'webpack-hot-middleware/client']
  },
  mode: 'development',
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
  plugins: [new webpack.HotModuleReplacementPlugin()]
}
