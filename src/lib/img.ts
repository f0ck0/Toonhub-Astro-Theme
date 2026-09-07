/** Card/collection images are shown around 180–260px; serve a 400w version. */

const CARD_SIZES = "(max-width: 749px) 46vw, (max-width: 1199px) 22vw, 200px"

export function cardImage(src?: string | null) {
  if (!src) return { src: "", srcset: "", sizes: CARD_SIZES }
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) {
    return { src, srcset: "", sizes: CARD_SIZES }
  }
  const path = src.startsWith("/") ? src : `/${src}`
  const thumb = collectionThumb(path) || `/img/w400${path}`
  return {
    src: thumb,
    srcset: "",
    sizes: CARD_SIZES,
  }
}

function collectionThumb(path: string) {
  const m = path.match(/^\/images\/collection\/([^/]+\.webp)$/)
  return m ? `/images/collection/w400/${m[1]}` : ""
}
