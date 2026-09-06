import mysql from "mysql2/promise"

function cleanDescription(html) {
  if (!html) return ""
  let cleaned = html
    .replace(/<meta\s+charset=[^>]*>/gi, "")
    .replace(/<meta\s+[^>]*>/gi, "")
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(/<font[^>]*>/gi, "")
    .replace(/<\/font>/gi, "")
    .replace(/<div[^>]*>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.substring(0, 5000)
}

function parseImages(imagesData) {
  if (!imagesData) return []
  try {
    let imgs = imagesData
    if (typeof imagesData === "string") {
      imgs = JSON.parse(imagesData)
    }
    if (!Array.isArray(imgs)) return []
    const urls = []
    for (const img of imgs) {
      const path = (typeof img === "string" ? img : (img && (img.url || img.path)) || null)
      if (path) {
        const filename = path.replace(/\\/g, "").replace(/^\/+storage\/+products\/+/, "").replace(/^\/+/, "")
        if (filename) {
          urls.push(`http://96.47.238.191:8888/images/products/${filename}`)
        }
      }
    }
    return urls
  } catch (e) {
    return []
  }
}

export default async function main({ container }) {
  const logger = container.resolve("logger")
  logger.info("Starting migration v2...")

  const conn = await mysql.createConnection({
    host: "172.18.0.2",
    port: 3306,
    user: "root",
    password: "REDACTED",
    database: "beikeshop",
  })

  const moduleService = container.resolve("product")

  logger.info("Deleting previously migrated products...")
  const [existing] = await conn.execute(`
    SELECT p.id FROM products p WHERE p.active=1 AND p.deleted_at IS NULL ORDER BY p.id
  `)
  const existingIds = existing.map(r => r.id)

  const allProducts = await moduleService.listProducts({}, { take: 5000 })
  const toDelete = allProducts.filter(p => p.handle && /\-\d+$/.test(p.handle) && existingIds.some(id => p.handle.endsWith(`-${id}`)))
  if (toDelete.length > 0) {
    await moduleService.deleteProducts(toDelete.map(p => p.id))
    logger.info(`Deleted ${toDelete.length} previously migrated products`)
  }

  const [products] = await conn.execute(`
    SELECT p.id, p.price, p.active, p.images, p.weight,
           pd.name, pd.content, pd.meta_title, pd.meta_description
    FROM products p
    LEFT JOIN product_descriptions pd ON p.id = pd.product_id AND pd.locale = 'en'
    WHERE p.deleted_at IS NULL AND p.active = 1
    ORDER BY p.id
  `)
  logger.info(`Found ${products.length} products in BeikeShop`)

  let created = 0, failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    try {
      const imageUrls = parseImages(p.images)
      const handle = ((p.name || `product-${p.id}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80)) + `-${p.id}`
      const desc = cleanDescription(p.content)
      const priceCents = Math.round((parseFloat(p.price) || 0) * 100)

      await moduleService.createProducts({
        title: p.name || `Product ${p.id}`,
        handle: handle,
        description: desc,
        status: "published",
        weight: p.weight || 400,
        thumbnail: imageUrls[0] || null,
        images: imageUrls.slice(0, 10).map(url => ({ url })),
        options: [{ title: "Default", values: ["Default"] }],
        variants: [{
          title: "Default",
          sku: `BK-${p.id}`,
          options: { Default: "Default" },
          prices: [{ amount: priceCents, currency_code: "usd" }],
          manage_inventory: false,
        }],
      })

      created++
      if (created % 100 === 0) logger.info(`Progress: ${created}/${products.length}`)
    } catch (e) {
      failed++
      if (failed < 10) logger.warn(`Failed product ${p.id}: ${e.message}`)
    }
  }

  logger.info(`Migration v2 complete: ${created} created, ${failed} failed out of ${products.length}`)
  await conn.end()
}
