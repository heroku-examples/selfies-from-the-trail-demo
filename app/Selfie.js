import React, { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import characters from './characters'
import api from './api'
import SVG_CONSTANTS from '../src/svg-constants'

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

const Face = ({ height, width, ...rest }) => {
  return (
    <svg height={height} width={width} {...rest}>
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2}
        ry={height / 2}
        fill="#000" // TODO: detect fill color from face
      />
    </svg>
  )
}

const App = () => {
  const { id } = useParams()
  const character = characters[id]

  // TODO: how does this work for portrait video or in mobile
  // TODO: this needs to fetched from the api for the specific character
  const CROP_WIDTH = SVG_CONSTANTS.width * 9
  const CROP_HEIGHT = SVG_CONSTANTS.height * 9
  const CROP_TOP = 0.2

  const [error, setError] = useState(null)
  const [videoEl, setVideoEl] = useState(null)
  const [imageUrls, setImageUrls] = useState(null)
  const [loading, setLoading] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [readyToShare, setReadyToShare] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)

    const { videoHeight: height, videoWidth: width } = videoEl
    const dataUrl = cropVideoToDataUrl(videoEl)

    try {
      const data = await (await api('/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: dataUrl,
          character: character.id,
          crop: {
            width: CROP_WIDTH,
            height: CROP_HEIGHT,
            top: height * CROP_TOP,
            left: (width - CROP_WIDTH) / 2
          }
        })
      })).json()
      setImageUrls(data)
      setLoading(false)
    } catch (e) {
      setImageUrls(null)
      setError(e.message)
      setLoading(false)
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
    <>
      {error && <div>{error}</div>}
      <div
        className="selfie-frame"
        style={{
          display: imageUrls ? 'none' : 'block'
        }}
      >
        <video
          ref={hasVideo}
          style={{
            transform: 'rotateY(180deg)'
          }}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={() => setVideoReady(true)}
        />
        {videoReady && (
          <Face
            className="face"
            style={{ top: videoEl.videoHeight * CROP_TOP }}
            width={CROP_WIDTH}
            height={CROP_HEIGHT}
          />
        )}
      </div>
      {imageUrls &&
        (readyToShare ? (
          <React.Fragment>
            <div className="landian">
              <img src={imageUrls.background} />
            </div>
            <button className="btn">Share on Twitter</button>
            <a
              className="text"
              href={imageUrls.background}
              download="image.png"
            >
              download
            </a>
            <Link to="/" className="text">
              restart
            </Link>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="landian">
              <img src={imageUrls.character} />
            </div>
            <button className="btn" onClick={() => setReadyToShare(true)}>
              Add your selfie
            </button>
            <button className="text" onClick={() => setImageUrls(null)}>
              or take another one
            </button>
          </React.Fragment>
        ))}
      {videoReady && !imageUrls && (
        <button
          className="btn"
          onClick={loading ? () => {} : submit}
          disabled={loading}
        >
          {loading ? 'Loading' : 'Take Selfie'}
        </button>
      )}
    </>
  )
}

export default App
