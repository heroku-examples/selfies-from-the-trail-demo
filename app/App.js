import React from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import ChooseCharacter from './ChooseCharacter'
import Character from './Character'
import Selfie from './Selfie'

const App = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <ChooseCharacter />
        </Route>
        <Route exact path="/character/:id">
          <Character />
        </Route>
        <Route exact path="/selfie/:id">
          <Selfie />
        </Route>
      </Switch>
    </Router>
  )
}

export default App
