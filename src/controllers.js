const sharp = require('sharp')
const path = require('path')
const fs = require('fs').promises
const svgson = require('svgson')
const { PNG } = require('pngjs')
const fetch = require('node-fetch')
const _ = require('lodash')
const UUID = require('uuid')
const config = require('getconfig')
const pRetry = require('p-retry')
const { minify: minifyHtml } = require('html-tagged-literals')
const aws = require('./aws')

const generateUploadId = (length = config.upload.keyLength) => {
  // Less ambiguous character set (no o, 0, 1, l, i, etc)
  const c = 'abcdefghjkmnpqrstuvwxyz23456789'
  return _.times(length, () => c.charAt(_.random(c.length - 1))).join('')
}

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

const transformObject = _.curry((transform, obj) =>
  Object.keys(obj).reduce((acc, key) => {
    acc[key] = transform(obj[key])
    return acc
  }, {})
)

const scaleObject = _.curry((scale, obj) =>
  transformObject((v) => v * scale, obj)
)
const intObject = _.curry((toInt, obj) => transformObject(toInt, obj))

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

exports.serverApp = {
  handler: async (req) => {
    let serverAppUrl
    try {
      // Allow for  the serverAppName config value to be a full url for easier
      // testing locally
      serverAppUrl = new URL(config.serverAppName)
    } catch (e) {
      if (e.code === 'ERR_INVALID_URL') {
        serverAppUrl = new URL(`https://${config.serverAppName}.herokuapp.com`)
      } else {
        throw e
      }
    }
    serverAppUrl.pathname = '/api/attendee-app'

    const res = await (await fetch(serverAppUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.payload)
    })).json()

    return res
  }
}

exports.changeBackground = {
  handler: async (req) => {
    req.server.plugins.kafka.changeBackground()
    return { status: 'success' }
  }
}

exports.character = {
  handler: async (req) => {
    const { character } = req.params
    const image = await readAppImage(`${character}-face.svg`)

    const svgData = await svgson.parse(image.toString())
    const face = svgData.children[1].children[0]

    let dimensions = {}
    if (face.type === 'ellipse') {
      const { rx, ry } = face.attributes
      dimensions = intObject(
        Math.ceil,
        scaleObject(2, { height: ry, width: rx })
      )
    } else {
      dimensions = await svgToPng(image).then(getPngAlphaBounds)
    }

    const res = { fill: face.attributes.fill, ...dimensions }
    req.log(['character'], res)

    return res
  }
}

exports.savePhoto = {
  handler: async (req) => {
    const user = req.state.data || {}
    const { image, character } = req.payload

    let uploadId = generateUploadId()

    const upload = async () => {
      const keyAvailable = await aws.keyAvailable(uploadId)

      if (!keyAvailable) {
        throw new Error('Retrying this')
      }

      const [imageUpload, characterUpload] = await Promise.all([
        aws.upload(`${uploadId}.png`, base64ImgToBuf(image)),
        aws.upload(`${uploadId}-c.png`, base64ImgToBuf(character))
      ])

      const htmlUpload = await aws.upload(
        uploadId,
        minifyHtml`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="X-UA-Compatible" content="chrome=1" />
            <title>Test title</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${config.twitter.card.title}">
            <meta name="twitter:image" content="${imageUpload.url}">
            ${
              config.twitter.card.site
                ? `<meta name="twitter:site" content="${config.twitter.card.site}">`
                : ''
            }
            ${
              config.twitter.card.description
                ? `<meta name="twitter:description" content="${config.twitter.card.description}">`
                : ''
            }
          </head>
          <body>
            <img src=${imageUpload.url} />
          </body>
        </html>
      `
      )

      return {
        imageUpload,
        characterUpload,
        htmlUpload
      }
    }

    const { imageUpload, characterUpload, htmlUpload } = await pRetry(upload, {
      retries: 5,
      onFailedAttempt: (err) => {
        const failedId = uploadId
        uploadId = generateUploadId()
        req.log(['save-files', 'retry', 'warn'], {
          failedId,
          newId: uploadId,
          attemptNumber: err.attemptNumber
        })
      }
    })

    req.log(['save-files'], {
      image: imageUpload,
      character: characterUpload,
      html: htmlUpload
    })

    const res = {
      image: imageUpload.url,
      character: characterUpload.url,
      html: htmlUpload.url
    }

    req.server.plugins.kafka.sendSubmission({
      ...res,
      uploadId,
      user: _.pick(user, 'id')
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
        ..._.pick(
          intObject(Math.round, scaleCharacterToBg(backgroundDims)),
          'height'
        )
      })
      .png()
      .toBuffer()

    const characterDims = await sharp(characterResize).metadata()
    const characterOnBg = await sharp(backgroundImage)
      .composite([
        {
          input: characterResize,
          ..._.pick(
            intObject(
              Math.round,
              characterPosition(characterDims, backgroundDims)
            ),
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
