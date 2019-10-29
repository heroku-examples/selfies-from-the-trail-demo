const sharp = require('sharp')
const path = require('path')
const fs = require('fs').promises
const svgson = require('svgson')
const { PNG } = require('pngjs')
const _ = require('lodash')
const UUID = require('uuid')
const aws = require('./aws')

const readAppImage = (image) =>
  fs.readFile(path.resolve(__dirname, '..', 'app', 'images', image))

const bufToBase64Img = (buf) =>
  `data:image/png;base64,${buf.toString('base64')}`

const base64ImgToBuf = (base64) =>
  Buffer.from(base64.replace('data:image/png;base64,', ''), 'base64')

const svgToPng = (image) =>
  sharp(image)
    .png()
    .toBuffer()

const svgDimensions = async (image) => {
  const data = await svgson.parse(
    Buffer.isBuffer(image) ? image.toString() : image
  )
  return {
    height: +data.attributes.height,
    width: +data.attributes.width
  }
}

const transformObject = (transform) => (obj) =>
  Object.keys(obj).reduce((acc, key) => {
    acc[key] = transform(obj[key])
    return acc
  }, {})

const scaleObject = (scale) => transformObject((v) => v * scale)
const roundObject = transformObject((v) => Math.round(v))

const positionObject = (position) => (obj, bg) => {
  const bottom = bg.height - bg.height * position.bottom
  const top = bottom - obj.height
  const right = bg.width - bg.width * position.right
  const left = right - obj.width
  return { top, left }
}

const getPngAlphaBounds = (image) =>
  new Promise((resolve, reject) => {
    new PNG({ filterType: 4 }).parse(image, (err, data) => {
      if (err) return reject(err)

      const getStartEnd = (arr) =>
        arr
          .map((rowOrCol) => rowOrCol.every((isTransparent) => isTransparent))
          .map((isTransparent, index, list) => {
            const prevIsTransparent = list[index - 1]
            if (!isTransparent && prevIsTransparent === true) {
              return index + 1
            } else if (isTransparent && prevIsTransparent === false) {
              return index
            }
            return null
          })
          .filter((v) => v !== null)

      const rows = _.range(0, data.height).map(() => [])
      const columns = _.range(0, data.width).map(() => [])

      for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
          const idx = (data.width * y + x) << 2
          const isTransparent = data.data[idx + 3] === 0
          rows[y].push(isTransparent)
          columns[x].push(isTransparent)
        }
      }

      const [xStart, xEnd] = getStartEnd(columns)
      const [yStart, yEnd] = getStartEnd(rows)

      resolve({
        left: xStart,
        top: yStart,
        right: xEnd,
        bottom: yEnd,
        width: xEnd - xStart,
        height: yEnd - yStart
      })
    })
  })

exports.character = {
  handler: async (req) => {
    const { character } = req.params
    const image = await readAppImage(`${character}-face.svg`)

    const svgData = await svgson.parse(image.toString())
    const faceFill = svgData.children[1].children[0].attributes.fill

    const dimensions = await svgToPng(image).then(getPngAlphaBounds)

    return { fill: faceFill, ...dimensions }
  }
}

exports.savePhoto = {
  handler: async (req) => {
    const user = req.state.data || {}
    const { image, character } = req.payload

    const [imageUpload, characterUpload] = await Promise.all(
      [image, character].map((v) =>
        aws.uploadPublicPng(UUID.v4(), base64ImgToBuf(v))
      )
    )

    const res = {
      image: imageUpload.url,
      character: characterUpload.url
    }

    req.server.plugins.kafka.send({
      ...res,
      user
    })

    return res
  }
}

exports.submit = {
  handler: async (req, h) => {
    const { image, crop: cropPayload, character } = req.payload

    const user = req.state.data || {}
    if (!user.id) user.id = UUID.v4()
    h.state('data', user)

    const crop = Object.keys(cropPayload).reduce((acc, key) => {
      acc[key] = parseInt(cropPayload[key], 10)
      return acc
    }, {})

    // Magic numbers
    // Scale handles how big to scale up the svgs
    const scaleSvg = scaleObject(5)
    // How tall the character should be on the final image
    //TODO: this might need to differ based on the height of the character
    const scaleCharacterToBg = scaleObject(0.5)
    // Where to position the character on the background for the final shareable image
    const characterPosition = positionObject({
      bottom: 0.1,
      right: 0.1
    })

    const faceDimensions = await readAppImage(`${character}-face.svg`)
      .then(svgToPng)
      .then(getPngAlphaBounds)
      .then(scaleSvg)

    const [body, face, hair] = await Promise.all(
      [
        `${character}-body.svg`,
        `${character}-face.svg`,
        `${character}-hair.svg`
      ].map(async (name) => {
        let image
        try {
          image = await readAppImage(name)
        } catch (e) {
          // Some people dont have hair and thats ok
          if (name === `${character}-hair.svg` && e.code === 'ENOENT') {
            return null
          }
          throw e
        }
        const dim = await svgDimensions(image).then(scaleSvg)
        // 72 is the default density maybe? It seems to look ok
        // If you lower this the resultant png is pixelated
        return sharp(image, scaleSvg({ density: 72 }))
          .resize(dim.width, dim.height)
          .png()
          .toBuffer()
      })
    )

    const faceImage = await sharp(base64ImgToBuf(image))
      .extract(_.pick(crop, 'top', 'left', 'width', 'height'))
      .composite([
        {
          input: Buffer.from(`
            <svg height="${crop.height}" width="${crop.width}">
              <ellipse
                cx="${crop.width / 2}"
                cy="${crop.height / 2}"
                rx="${crop.width / 2}"
                ry="${crop.height / 2}"
              />
            </svg>
          `),
          blend: 'dest-in'
        }
      ])
      .png()
      .toBuffer()
      .then((b) =>
        sharp(b)
          .resize({
            withoutEnlargement: true,
            ..._.pick(faceDimensions, 'height', 'width')
          })
          .png()
          .toBuffer()
      )

    const characterImage = await sharp(body)
      .composite(
        await Promise.all(
          [
            { input: face },
            {
              input: faceImage,
              top: faceDimensions.top,
              left: faceDimensions.left
            },
            hair && { input: hair }
          ].filter(Boolean)
        )
      )
      .png()
      .toBuffer()

    const backgroundImage = await readAppImage('submission-bg.svg')
    const backgroundDims = await svgDimensions(backgroundImage)
    const characterResize = await sharp(characterImage)
      .resize({
        withoutEnlargement: true,
        ..._.pick(roundObject(scaleCharacterToBg(backgroundDims)), 'height')
      })
      .png()
      .toBuffer()

    const characterDims = await sharp(characterResize).metadata()
    const characterOnBg = await sharp(backgroundImage)
      .composite([
        {
          input: characterResize,
          ..._.pick(
            roundObject(characterPosition(characterDims, backgroundDims)),
            'top',
            'left'
          )
        }
      ])
      .png()
      .toBuffer()

    return {
      character: bufToBase64Img(characterImage),
      background: bufToBase64Img(characterOnBg)
    }
  }
}
