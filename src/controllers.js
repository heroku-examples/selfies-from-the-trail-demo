const sharp = require('sharp')

const FACE_WIDTH = 21.27
const FACE_HEIGHT = 29.23

exports.submit = {
  handler: async (req) => {
    const { image, width, height, character } = req.payload

    const svgWidth = FACE_WIDTH
    const svgHeight = FACE_HEIGHT

    const circleImage = sharp(
      Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64')
    )
      .resize(22, 30)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
               <g>
                 <path d="M21.71,14.71c.11,7.93-6,14.45-10.63,14.52S.14,23,0,15-.26.09,10.65,0C23.16-.1,21.59,6.78,21.71,14.71Z"/>
               </g>
             </svg>`
          ),
          blend: 'dest-in'
        }
      ])

    const res1 = await circleImage.png().toBuffer()
    // const res2 = await circleImage2.png().toBuffer()

    return {
      image: res1.toString('base64'),
      fullImage: res1.toString('base64')
      //image2: res2.toString('base64')
    }
  }
}
