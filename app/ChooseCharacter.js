import React from 'react'
import { Link } from 'react-router-dom'
import characters from './characters'

const ChooseCharacter = () => {
  return (
    <React.Fragment>
      <p className="intro">Select a character</p>
      <ul className="landian-list">
        {characters.group.map((c) => (
          <Link key={c.id} to={`/character/${c.id}`}>
            <li className="landian">
              <img src={c.src} />
            </li>
          </Link>
        ))}
      </ul>
    </React.Fragment>
  )
}

export default ChooseCharacter
