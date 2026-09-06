import mysql from "mysql2/promise"

export default async function main({ container }) {
  const logger = container.resolve("logger")
  const productModule = container.resolve("product")

  const conn = await mysql.createConnection({
    host: "172.18.0.2",
    port: 3306,
    user: "root",
    password: "REDACTED",
    database: "beikeshop",
  })

  const [cats] = await conn.execute(`
    SELECT c.id, c.parent_id, c.active, cd.name
    FROM categories c
    LEFT JOIN category_descriptions cd ON c.id = cd.category_id
    WHERE c.active = 1
    ORDER BY c.parent_id, c.id
  `)
  logger.info(`Found ${cats.length} categories`)

  const beikeToMedusaCatMap = {}

  for (const cat of cats) {
    const handle = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const parentMedusaId = cat.parent_id ? beikeToMedusaCatMap[cat.parent_id] : null

    try {
      const created = await productModule.createProductCategories([{
        name: cat.name,
        handle: handle + "-" + cat.id,
        is_active: true,
        parent_category_id: parentMedusaId || undefined,
      }])

      const createdCat = Array.isArray(created) ? created[0] : created
      beikeToMedusaCatMap[cat.id] = createdCat.id
      logger.info(`Created category: ${cat.name} (${cat.id} -> ${createdCat.id})`)
    } catch (e) {
      logger.warn(`Failed category ${cat.id} (${cat.name}): ${e.message}`)
    }
  }

  logger.info(`Category map: ${JSON.stringify(beikeToMedusaCatMap)}`)

  const [prodCats] = await conn.execute("SELECT product_id, category_id FROM product_categories")

  const [beikeProducts] = await conn.execute(`
    SELECT p.id FROM products p WHERE p.active=1 AND p.deleted_at IS NULL ORDER BY p.id
  `)

  const allMedusaProducts = await productModule.listProducts({}, { take: 5000 })
  const handleToMedusaId = {}
  for (const p of allMedusaProducts) {
    if (p.handle && /\-\d+$/.test(p.handle)) {
      const beikeId = p.handle.split("-").pop()
      handleToMedusaId[beikeId] = p.id
    }
  }

  let linked = 0
  for (const pc of prodCats) {
    const medusaProductId = handleToMedusaId[pc.product_id]
    const medusaCatId = beikeToMedusaCatMap[pc.category_id]
    if (medusaProductId && medusaCatId) {
      try {
        await productModule.updateProducts(medusaProductId, {
          categories: [{ id: medusaCatId }],
        })
        linked++
      } catch (e) {}
    }
  }

  logger.info(`Linked ${linked} products to categories`)
  await conn.end()
}
