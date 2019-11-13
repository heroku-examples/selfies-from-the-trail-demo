import React, { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import characters from './characters'

const Character = () => {
  const { id } = useParams()

  useEffect(() => {
    document.body.classList.add('full')
    return () => {
      document.body.classList.remove('full')
    }
  })

  return (
    <React.Fragment>
      <div className="landian">
        <img src={characters[id].src} />
      </div>
      <nav className="cta">
        <Link to={`/selfie/${id}`} className="btn">
          Take a selfie
        </Link>
        <Link to="/" className="text">
          restart
        </Link>
      </nav>
    </React.Fragment>
  )
}

export default Character
