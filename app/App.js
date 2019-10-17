import React, { useState, useCallback } from 'react'

const createCanvas = ({ width, height }) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const cropVideoToDataUrl = (video) => {
  const { videoHeight, videoWidth } = video
  const canvas = createCanvas({ width: videoWidth, height: videoHeight })
  const context = canvas.getContext('2d')
  context.drawImage(
    video,
    0,
    0,
    videoWidth,
    videoHeight,
    0,
    0,
    videoWidth,
    videoHeight
  )
  return canvas.toDataURL()
}

const App = () => {
  const [error, setError] = useState(null)
  const [videoEl, setVideoEl] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [videoReady, setVideoReady] = useState(false)

  const submit = async () => {
    const dataUrl = cropVideoToDataUrl(videoEl)
    setImageUrl(dataUrl)
    const formData = new FormData()
    formData.append('image', dataUrl)
    try {
      await fetch(window.location.href + 'api/submit', {
        method: 'POST',
        body: formData
      })
    } catch (e) {
      setImageUrl(null)
      setError(e.message)
    }
  }

  const hasVideo = useCallback((node) => {
    if (node !== null) {
      window.navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: 'user'
          }
        })
        .then((stream) => {
          node.srcObject = stream
          setVideoEl(node)
        })
        .catch((e) => setError(e.message))
    }
  }, [])

  return (
    <div>
      {error && <div>{error}</div>}
      <video
        ref={hasVideo}
        style={{
          display: imageUrl ? 'none' : 'block',
          width: '100%',
          height: '100%',
          left: '50%',
          position: 'absolute',
          top: '50%',
          transform: 'translate(-50%, -50%) rotateY(180deg)'
        }}
        autoPlay
        muted
        playsInline
        onLoadedMetadata={() => setVideoReady(true)}
      />
      <img
        style={{
          display: imageUrl ? 'block' : 'none',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          left: '50%',
          position: 'absolute',
          top: '50%',
          transform: 'translate(-50%, -50%) rotateY(180deg)'
        }}
        src={imageUrl}
      />
      {videoReady && (
        <button
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            border: 'none',
            background: 'red',
            padding: 10
          }}
          onClick={imageUrl ? () => setImageUrl(null) : submit}
        >
          {imageUrl ? 'Reset' : 'Submit'}
        </button>
      )}
    </div>
  )
}

export default App
