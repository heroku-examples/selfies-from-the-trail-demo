import React from 'react'
import QRCode from 'qrcode.react'

const Character = () => {
  const url = new URL(window.location)
  url.pathname = '/'
  const entryUrl = url.toString()

  return (
    <div className="overlay">
      <div className="wrapper">
        <h1>{entryUrl}</h1>
        <div id="QR-code">
          <QRCode renderAs="svg" value={entryUrl} width="100%" height="100%" />
        </div>
      </div>
    </div>
  )
}

export default Character
