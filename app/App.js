import React from 'react'

const id =
  Math.random()
    .toString(36)
    .substring(2, 15) +
  Math.random()
    .toString(36)
    .substring(2, 15)

const App = ({ ws }) => {
  const sendMessage = () => {
    const data = JSON.stringify({ date: new Date(), id })
    console.log(data)
    ws.send(data)
  }

  return (
    <div>
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}

export default App
