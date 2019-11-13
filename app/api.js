const url = new URL(window.location)
url.pathname = '/api'
export default (p, options = {}) => fetch(url.toString() + p, options)
