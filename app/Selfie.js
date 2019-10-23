import React, { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as characters from './characters'
import api from './api'

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
  context.drawImage(video, 0, 0)
  return canvas.toDataURL()
}

const App = () => {
  const { id } = useParams()
  const character = characters[id]

  const [error, setError] = useState(null)
  const [videoEl, setVideoEl] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [fullImageUrl, setFullImageUrl] = useState(null)
  const [videoReady, setVideoReady] = useState(false)
  const [readyToShare, setReadyToShare] = useState(false)

  const submit = async () => {
    const { videoHeight: height, videoWidth: width } = videoEl
    const dataUrl = cropVideoToDataUrl(videoEl)
    const formData = new FormData()
    formData.append('image', dataUrl)
    formData.append('height', height)
    formData.append('width', width)
    formData.append('character', id)
    try {
      const res = await api('/submit', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setImageUrl(`data:image/png;base64,${data.image}`)
      setFullImageUrl(`data:image/png;base64,${data.fullImage}`)
    } catch (e) {
      setImageUrl(null)
      setFullImageUrl(null)
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
          transform: 'rotateY(180deg)'
        }}
        autoPlay
        muted
        playsInline
        onLoadedMetadata={() => setVideoReady(true)}
      />
      <img
        src={character.face}
        style={{
          display: imageUrl ? 'none' : 'block',
          opacity: 0.4
        }}
      />
      {imageUrl &&
        (readyToShare ? (
          <React.Fragment>
            <div className="landian">
              <img src={fullImageUrl} />
            </div>
            <button className="btn">Share on Twitter</button>
            <button className="text">download</button>
            <Link to="/" className="text">
              restart
            </Link>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="landian">
              <img src={imageUrl} />
            </div>
            <button className="btn" onClick={() => setReadyToShare(true)}>
              Add your selfie
            </button>
            <button className="text" onClick={() => setImageUrl(null)}>
              or take another one
            </button>
          </React.Fragment>
        ))}

      {videoReady && !imageUrl && (
        <button className="btn" onClick={submit}>
          Take Selfie
        </button>
      )}
    </div>
  )
}

export default App
