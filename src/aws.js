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

exports.upload = (filePath, body) => {
  const s3Path = `public/${filePath}`

  const s3Url = new URL(
    s3Path,
    `http://${config.aws.bucket}.s3.amazonaws.com`
  ).toString()

  return new Promise((resolve, reject) => {
    s3.putObject(
      {
        Key: s3Path,
        Body: body,
        Bucket: config.aws.bucket,
        ContentType: getContentType(path.extname(filePath).slice(1))
      },
      (err, data) => {
        if (err) return reject(err)

        resolve(
          Object.assign(
            {
              s3Url: s3Url,
              url: config.shareDomain
                ? new URL(filePath, config.shareDomain).toString()
                : s3Url
            },
            data
          )
        )
      }
    )
  })
}
