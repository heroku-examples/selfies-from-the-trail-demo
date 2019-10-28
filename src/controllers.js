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

    return Object.assign({ fill: faceFill }, dimensions)
  }
}

exports.savePhoto = {
  handler: async (req) => {
    const user = req.state.user || {}
    const { photo } = req.payload
    const data = await aws.uploadPublicPng(UUID.v4(), base64ImgToBuf(photo))
    req.server.plugins.kafka.send({ url: data.url, user })
    return data
  }
}

exports.submit = {
  handler: async (req, h) => {
    const { image, crop: cropPayload, character } = req.payload

    const user = req.state.user || {}
    if (!user.id) user.id = UUID.v4()
    h.state('user', user)

    const crop = Object.keys(cropPayload).reduce((acc, key) => {
      acc[key] = parseInt(cropPayload[key], 10)
      return acc
    }, {})

    // Magic numbers
    // Scale handles how big to scale up the svgs
    const scale = 5
    // Where to position the character on the background for the final shareable image
    const characterPositionOnBg = {
      height: 0.5, // TODO: this might need to differ based on the height of the character
      bottom: 0.1,
      right: 0.1
    }

    const faceDimensions = await readAppImage(`${character}-face.svg`)
      .then(svgToPng)
      .then(getPngAlphaBounds)
      .then((dims) =>
        Object.assign(dims, {
          width: dims.width * scale,
          height: dims.height * scale
        })
      )

    req.log([], faceDimensions)

    const [body, face, hair] = await Promise.all(
      [
        `${character}-body.svg`,
        `${character}-face.svg`,
        `${character}-hair.svg`
      ].map(async (name) => {
        const image = await readAppImage(name)
        const dim = await svgDimensions(image)
        // 72 is the default density maybe? It seems to look ok
        // If you lower this the resultant png is pixelated
        return sharp(image, { density: 72 * scale })
          .resize(dim.width * scale, dim.height * scale)
          .png()
          .toBuffer()
      })
    )

    const faceImage = await sharp(base64ImgToBuf(image))
      .extract({
        top: crop.top,
        left: crop.left,
        width: crop.width,
        height: crop.height
      })
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
      .then((b) => sharp(b))
      .resize({
        width: faceDimensions.width,
        height: faceDimensions.height,
        withoutEnlargement: true
      })
      .png()
      .toBuffer()

    const characterImage = await sharp(body)
      .composite(
        await Promise.all([
          { input: face },
          {
            input: faceImage,
            top: faceDimensions.top,
            left: faceDimensions.left
          },
          { input: hair }
        ])
      )
      .png()
      .toBuffer()

    const backgroundImage = await readAppImage('submission-bg.svg')
    const backgroundDim = await svgDimensions(backgroundImage)
    const characterResize = await sharp(characterImage)
      .resize({
        height: Math.round(backgroundDim.height * characterPositionOnBg.height),
        withoutEnlargement: true
      })
      .png()
      .toBuffer()

    const characterMeta = await sharp(characterResize).metadata()
    const characterBottom =
      backgroundDim.height - backgroundDim.height * characterPositionOnBg.bottom
    const characterTop = characterBottom - characterMeta.height
    const characterRight =
      backgroundDim.width - backgroundDim.width * characterPositionOnBg.right
    const characterLeft = characterRight - characterMeta.width

    const characterOnBg = await sharp(backgroundImage)
      .composite([
        {
          input: characterResize,
          top: Math.round(characterTop),
          left: Math.round(characterLeft)
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
