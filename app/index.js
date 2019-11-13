import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

import './css/reset.css'
import './css/submission.css'

ReactDOM.render(<App />, document.getElementById('root'))

if (module.hot) {
  module.hot.accept(App, () => {
    ReactDOM.render(<App />, document.getElementById('root'))
  })
}
