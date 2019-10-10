import React from 'react'
import ReactDOM from 'react-dom'
import ReconnectingWebSocket from 'reconnecting-websocket'
import App from './App'

const wsUrl = new URL(window.location.href)
wsUrl.protocol = 'ws'
wsUrl.port = +wsUrl.port + 1

const ws = new ReconnectingWebSocket(wsUrl.toString(), null, {
  reconnectInterval: 1000,
  reconnectDecay: 1
})

ReactDOM.render(<App ws={ws} />, document.getElementById('root'))

if (module.hot) {
  module.hot.accept(App, () => {
    ReactDOM.render(<App ws={ws} />, document.getElementById('root'))
  })
}
