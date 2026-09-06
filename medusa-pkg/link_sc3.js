import pg from "pg"

export default async function main({ container }) {
  const logger = container.resolve("logger")

  const client = new pg.Client({
    host: "172.18.0.3",
    port: 5432,
    user: "spree",
    password: "REDACTED",
    database: "medusa_toonhub",
    sslmode: "disable",
  })
  await client.connect()

  const scId = "sc_01M1JFPEQM6CNS443MJQJGG22N"

  const { rows: allProducts } = await client.query("SELECT id FROM product WHERE deleted_at IS NULL")
  logger.info(`Total products: ${allProducts.length}`)

  const { rows: existing } = await client.query("SELECT product_id FROM product_sales_channel WHERE sales_channel_id = $1", [scId])
  const existingSet = new Set(existing.map(r => r.product_id))
  logger.info(`Already linked: ${existingSet.size}`)

  const toLink = allProducts.filter(p => !existingSet.has(p.id))
  logger.info(`To link: ${toLink.length}`)

  let linked = 0
  for (const p of toLink) {
    await client.query(
      "INSERT INTO product_sales_channel (product_id, sales_channel_id, id) VALUES ($1, $2, gen_random_uuid()::text)",
      [p.id, scId]
    )
    linked++
  }

  logger.info(`Linked ${linked} products to sales channel ${scId}`)
  await client.end()
}
