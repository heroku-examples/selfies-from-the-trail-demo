import React from 'react'

const BlobImage = (props) => {
  const { src } = props

  console.log(src)

  if (!src) return null

  const prevSrcRef = React.useRef(src)

  React.useEffect(() => {
    if (prevSrcRef.current !== src) {
      URL.revokeObjectURL(prevSrcRef.current)
    }

    prevSrcRef.current = src

    return () => URL.revokeObjectURL(src)
  }, [src])

  return <img {...props} src={URL.createObjectURL(src)} />
}

export default BlobImage
