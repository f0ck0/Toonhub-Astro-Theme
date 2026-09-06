import mysql from "mysql2/promise"

export default async function main({ container }) {
  const logger = container.resolve("logger")
  logger.info("Starting BeikeShop -> Medusa migration...")

  const conn = await mysql.createConnection({
    host: "172.18.0.2",
    port: 3306,
    user: "root",
    password: "REDACTED",
    database: "beikeshop",
  })

  const [products] = await conn.execute(`
    SELECT p.id, p.price, p.active, p.images, p.weight,
           pd.name, pd.content
    FROM products p
    LEFT JOIN product_descriptions pd ON p.id = pd.product_id AND pd.locale = 'en'
    WHERE p.deleted_at IS NULL AND p.active = 1
    ORDER BY p.id
  `)

  logger.info(`Found ${products.length} products in BeikeShop`)

  const moduleService = container.resolve("product")

  let created = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    try {
      const images = []
      if (p.images) {
        try {
          const imgs = JSON.parse(p.images)
          for (const img of imgs) {
            const url = typeof img === "string" ? img : (img && (img.url || img.path)) || null
            if (url) {
              const fullUrl = url.startsWith("http") ? url : `http://96.47.238.191:8080/${url.replace(/^\//, "")}`
              images.push({ url: fullUrl })
            }
          }
        } catch (e) {}
      }

      const handle = ((p.name || `product-${p.id}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80)) + `-${p.id}`

      await moduleService.createProducts({
        title: p.name || `Product ${p.id}`,
        handle: handle,
        description: (p.content || "").substring(0, 2000),
        status: "published",
        weight: p.weight || 400,
        thumbnail: images[0] ? images[0].url : null,
        images: images.slice(0, 5),
        options: [{ title: "Default", values: ["Default"] }],
        variants: [{
          title: "Default",
          sku: `BK-${p.id}`,
          options: { Default: "Default" },
          prices: [{ amount: Math.round((parseFloat(p.price) || 0) * 100), currency_code: "usd" }],
          manage_inventory: false,
        }],
      })

      created++
      if (created % 50 === 0) {
        logger.info(`Progress: ${created}/${products.length} created`)
      }
    } catch (e) {
      failed++
      if (failed < 10) logger.warn(`Failed product ${p.id}: ${e.message}`)
    }
  }

  logger.info(`Migration complete: ${created} created, ${failed} failed out of ${products.length}`)
  await conn.end()
}
