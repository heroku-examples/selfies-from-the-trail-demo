const winstonMethods = {
  error: 'error',
  warn: 'log',
  info: 'log',
  http: 'log',
  verbose: 'log',
  debug: 'log',
  silly: 'log'
}

module.exports = (name) =>
  Object.keys(winstonMethods).reduce((acc, winstonMethod) => {
    const consoleMethod = winstonMethods[winstonMethod]
    acc[winstonMethod] = (...message) =>
      // eslint-disable-next-line no-console
      console[consoleMethod](`${name}::${winstonMethod}`, ...message)
    return acc
  }, {})
