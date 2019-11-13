import React from 'react'
import { Link } from 'react-router-dom'

const FourOhFour = () => {
  return (
    <React.Fragment>
      <Link className="btn" to="/">
        This page does not exist, go home
      </Link>
    </React.Fragment>
  )
}

export default FourOhFour
