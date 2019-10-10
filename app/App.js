import React, { useState } from 'react'

const App = ({ ws }) => {
  const [text, setText] = useState('')

  const sendMessage = () => {
    ws.send(JSON.stringify({ created_at: new Date(), text }))
  }

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}

export default App
