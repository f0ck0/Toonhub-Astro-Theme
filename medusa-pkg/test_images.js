import mysql from "mysql2/promise"

export default async function main({ container }) {
  const logger = container.resolve("logger")

  const conn = await mysql.createConnection({
    host: "172.18.0.2",
    port: 3306,
    user: "root",
    password: "REDACTED",
    database: "beikeshop",
  })

  const [products] = await conn.execute(`
    SELECT p.id, p.images
    FROM products p
    WHERE p.id = 100305
  `)

  const p = products[0]
  logger.info(`Product ID: ${p.id}`)
  logger.info(`Raw images type: ${typeof p.images}`)
  logger.info(`Raw images: ${p.images}`)

  if (p.images) {
    try {
      const imgs = JSON.parse(p.images)
      logger.info(`Parsed type: ${typeof imgs}, isArray: ${Array.isArray(imgs)}`)
      logger.info(`Parsed length: ${imgs.length}`)
      for (const img of imgs) {
        logger.info(`  Image: ${img} (type: ${typeof img})`)
        const filename = img.replace(/\\/g, "").replace(/^\/+storage\/+products\/+/, "").replace(/^\/+/, "")
        logger.info(`  Filename: ${filename}`)
      }
    } catch (e) {
      logger.info(`Parse error: ${e.message}`)
    }
  }

  await conn.end()
}
