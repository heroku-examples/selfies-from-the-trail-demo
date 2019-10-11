import React from 'react'
import ReactDOM from 'react-dom'
import ReconnectingWebSocket from 'reconnecting-websocket'
import App from './App'

const wsUrl = `ws${window.location.href.match(/^http(s?:\/\/.*)\/.*$/)[1]}`
const ws = new ReconnectingWebSocket(wsUrl, null, {
  reconnectInterval: 1000,
  reconnectDecay: 1
})

ReactDOM.render(<App ws={ws} />, document.getElementById('root'))

if (module.hot) {
  module.hot.accept(App, () => {
    ReactDOM.render(<App ws={ws} />, document.getElementById('root'))
  })
}
