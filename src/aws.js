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

exports.upload = (key, body) => {
  const contentType = getContentType(path.extname(key).slice(1))
  const fileKey = `public/${key}`
  const s3Domain = `http://${config.aws.bucket}.s3.amazonaws.com/`
  return new Promise((resolve, reject) => {
    s3.putObject(
      {
        Key: fileKey,
        Body: body,
        Bucket: config.aws.bucket,
        ContentType: contentType
      },
      (err, data) => {
        if (err) return reject(err)

        resolve(
          Object.assign(
            {
              s3Url: `${s3Domain}${fileKey}`,
              url: `${config.shareDomain || s3Domain}${fileKey}`
            },
            data
          )
        )
      }
    )
  })
}
