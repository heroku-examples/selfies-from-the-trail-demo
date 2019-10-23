import React from 'react'
import { Link } from 'react-router-dom'
import * as characters from './characters'

const ChooseCharacter = () => {
  return (
    <React.Fragment>
      <p>Select a character</p>
      <ul className="landian-list">
        {characters.group1.map((c) => (
          <Link key={c.id} to={`/character/${c.id}`}>
            <li className="landian">
              <img src={c.src} />
            </li>
          </Link>
        ))}
      </ul>
      <nav className="pagination">
        <a href="" className="active"></a>
        <a href=""></a>
        <a href=""></a>
      </nav>
      <ul className="landian-list">
        {characters.group2.map((c) => (
          <Link key={c.id} to={`/character/${c.id}`}>
            <li className="landian">
              <img src={c.src} />
            </li>
          </Link>
        ))}
      </ul>
      <nav className="pagination">
        <a href="" className="active"></a>
        <a href=""></a>
        <a href=""></a>
      </nav>
    </React.Fragment>
  )
}

export default ChooseCharacter
