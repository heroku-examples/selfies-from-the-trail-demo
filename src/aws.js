const AWS = require('aws-sdk')
const config = require('getconfig')

const s3 = new AWS.S3({
  accessKeyId: config.aws.id,
  secretAccessKey: config.aws.secret,
  region: config.aws.region
})

exports.uploadPublicPng = (key, body) =>
  new Promise((resolve, reject) => {
    s3.putObject(
      {
        Key: `public/${key}.png`,
        Body: body,
        Bucket: config.aws.bucket,
        ContentType: 'image/png'
      },
      (err, data) => {
        if (err) return reject(err)

        resolve(
          Object.assign(
            {
              url: `http://${config.aws.bucket}.s3.amazonaws.com/public/${key}.png`
            },
            data
          )
        )
      }
    )
  })
