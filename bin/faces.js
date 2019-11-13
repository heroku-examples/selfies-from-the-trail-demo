/* eslint no-console:0 */

const _ = require('lodash')
const controllers = require('../src/controllers')

const main = async (indices) => {
  const res = await Promise.all(
    indices
      .map((i) => i.toString().padStart(2, '0'))
      .map((id) =>
        controllers.character
          .handler({
            params: { character: `landian-${id}` }
          })
          .then((o) => ({ id, ...o }))
      )
  )

  return { res }
}

main(_.range(1, 31))
  .then(JSON.stringify)
  .then(console.log)
  .catch(console.error)
