const AWS = require('aws-sdk')
const config = require('getconfig')
const path = require('path')

const s3 = new AWS.S3({
  accessKeyId: config.aws.id,
  secretAccessKey: config.aws.secret,
  region: config.aws.region
})

const getContentType = (ext) => {
  const map = {
    png: 'image/png',
    html: 'text/html'
  }
  return map[ext] || map.html
}

exports.keyAvailable = async (filePath) => {
  const s3Path = `public/${filePath}`

  try {
    await s3
      .getObject({
        Key: s3Path,
        Bucket: config.aws.bucket
      })
      .promise()
  } catch (e) {
    if (e.code === 'NoSuchKey') {
      return true
    }
  }

  return false
}

exports.upload = async (filePath, body) => {
  const s3Path = `public/${filePath}`

  const s3Url = new URL(
    s3Path,
    `http://${config.aws.bucket}.s3.amazonaws.com`
  ).toString()

  const resp = await s3
    .putObject({
      Key: s3Path,
      Body: body,
      Bucket: config.aws.bucket,
      ContentType: getContentType(path.extname(filePath).slice(1))
    })
    .promise()

  return Object.assign(
    {
      s3Url: s3Url,
      url: config.upload.domain
        ? new URL(filePath, config.upload.domain).toString()
        : s3Url
    },
    resp
  )
}
