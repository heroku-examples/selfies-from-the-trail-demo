const fs = require('fs').promises
const path = require('path')

exports.submit = {
  handler: async (req) => {
    await fs.writeFile(
      path.resolve(__dirname, '..', 'test.png'),
      req.payload.image.replace(/^data:image\/png;base64,/, ''),
      { encoding: 'base64' }
    )
    return 'success'
  }
}
