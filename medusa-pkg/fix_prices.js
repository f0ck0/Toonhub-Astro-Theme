import pg from "pg"
import mysql from "mysql2/promise"

export default async function main({ container }) {
  const logger = container.resolve("logger")

  const client = new pg.Client({
    host: "172.18.0.3",
    port: 5432,
    user: "spree",
    password: "REDACTED",
    database: "medusa_toonhub",
  })
  await client.connect()

  const conn = await mysql.createConnection({
    host: "172.18.0.2",
    port: 3306,
    user: "root",
    password: "REDACTED",
    database: "beikeshop",
  })

  const { rows: variants } = await client.query(`
    SELECT pv.id, pv.sku
    FROM product_variant pv
    WHERE pv.sku LIKE 'BK-%'
    AND NOT EXISTS (
      SELECT 1 FROM product_variant_price_set pvps
      WHERE pvps.variant_id = pv.id
    )
  `)
  logger.info(`Variants without prices: ${variants.length}`)

  const skuToBeikeId = {}
  for (const v of variants) {
    const beikeId = v.sku.replace("BK-", "")
    skuToBeikeId[v.id] = beikeId
  }

  const beikeIds = Object.values(skuToBeikeId)
  const [beikeProducts] = await conn.execute(`
    SELECT id, price FROM products WHERE id IN (${beikeIds.map(() => "?").join(",")})
  `, beikeIds)

  const priceMap = {}
  for (const p of beikeProducts) {
    priceMap[p.id] = parseFloat(p.price) || 0
  }

  let created = 0
  for (const v of variants) {
    const beikeId = skuToBeikeId[v.id]
    const price = Math.round(priceMap[beikeId] * 100)

    const psetId = "pset_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 15)
    await client.query("INSERT INTO price_set (id) VALUES ($1)", [psetId])
    await client.query("INSERT INTO product_variant_price_set (id, variant_id, price_set_id) VALUES ($1, $2, $3)", [
      "pvps_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 15),
      v.id,
      psetId,
    ])
    await client.query("INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())", [
      "price_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 15),
      psetId,
      "usd",
      price,
      JSON.stringify({ value: price.toString(), precision: 20 }),
    ])
    created++
  }

  logger.info(`Created prices for ${created} variants`)
  await client.end()
  await conn.end()
}
