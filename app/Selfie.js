import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import qs from 'query-string'
import characters from './characters'
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

const Face = ({ height, width, color, ...rest }) => {
  return (
    <svg height={height} width={width} {...rest}>
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2}
        ry={height / 2}
        fill={color}
      />
    </svg>
  )
}

const App = () => {
  const { id } = useParams()
  const character = characters[id]

  // How far to position the face crop circle from the top of the video
  const CROP_TOP = 0.2

  // We read the absolute pixel size of the character's face from the server
  // and then scale up by this factor
  // TODO: this works well for a 640x480 size video but might need to change
  // for mobile or smaller resized browser windows
  const FACE_SCALE = 9

  const [characterData, setCharacterData] = useState({})
  const [error, setError] = useState(null)
  const [videoEl, setVideoEl] = useState(null)
  const [imageUrls, setImageUrls] = useState(null)
  const [loading, setLoading] = useState(null)
  const [videoReady, setVideoReady] = useState(false)
  const [share, setShare] = useState(false)

  const submit = async () => {
    const { videoHeight: height, videoWidth: width } = videoEl
    const dataUrl = cropVideoToDataUrl(videoEl)

    setLoading(dataUrl)
    setError(null)

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
            width: characterData.width * FACE_SCALE,
            height: characterData.height * FACE_SCALE,
            top: height * CROP_TOP,
            left: (width - characterData.width * FACE_SCALE) / 2
          }
        })
      })).json()
      setImageUrls(data)
      setLoading(null)
    } catch (e) {
      setImageUrls(null)
      setError(e.message)
      setLoading(null)
    }
  }

  const addSelfie = async () => {
    try {
      const data = await (await api('/save-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageUrls.background,
          character: imageUrls.character
        })
      })).json()
      setShare(data)
    } catch (e) {
      setError(e.message)
      setShare(null)
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

  useEffect(() => {
    const addFull = imageUrls
    if (addFull) document.body.classList.add('full')
    return () => {
      document.body.classList.remove('full')
    }
  }, [imageUrls])

  useEffect(() => {
    const fetchData = async () => {
      const res = await api(`/character/${character.id}`)
      const data = await res.json()
      setCharacterData(data)
    }
    fetchData()
  }, [character.id])

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
            transform: 'rotateY(180deg)',
            display: loading ? 'none' : 'block'
          }}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={() => setVideoReady(true)}
        />
        {loading && <img src={loading} />}
        {videoReady && characterData.fill && (
          <Face
            className="face"
            style={{ top: videoEl.videoHeight * CROP_TOP }}
            width={characterData.width * FACE_SCALE}
            height={characterData.height * FACE_SCALE}
            color={characterData.fill}
          />
        )}
      </div>
      {videoReady && !imageUrls && (
        <>
          <button
            className="btn"
            onClick={loading ? () => {} : submit}
            disabled={loading}
          >
            {loading ? 'Loading' : 'Take Selfie'}
          </button>
          {!loading && (
            <Link to="/" className="text">
              restart
            </Link>
          )}
        </>
      )}
      {imageUrls &&
        (share ? (
          <React.Fragment>
            <div className="landian">
              <img src={imageUrls.background} />
            </div>
            <a
              href={`https://twitter.com/intent/tweet?${qs.stringify({
                text: 'A message to tweet along with the url',
                url: share.image,
                hashtags: 'dreamforce,heroku',
                via: 'heroku',
                related: 'heroku,salesforce'
              })}`}
              className="btn"
              rel="noopener noreferrer"
              target="_blank"
            >
              Share on Twitter
            </a>
            {/* TODO: send to email? */}
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
            <button className="btn" onClick={addSelfie}>
              Add your selfie
            </button>
            <button className="text" onClick={() => setImageUrls(null)}>
              or take another one
            </button>
          </React.Fragment>
        ))}
    </>
  )
}

export default App
