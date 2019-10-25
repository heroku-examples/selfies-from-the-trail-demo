// Magic numbers. These are hard to detect since the svg images that we layer
// all have a viewbox to make layering easier but this is where the actual edges
// of the face start
const SVG_FACE_TOP = 38
const SVG_FACE_LEFT = 43
const SVG_FACE_WIDTH = 22
const SVG_FACE_HEIGHT = 29

module.exports = {
  top: SVG_FACE_TOP,
  left: SVG_FACE_LEFT,
  width: SVG_FACE_WIDTH,
  height: SVG_FACE_HEIGHT
}
