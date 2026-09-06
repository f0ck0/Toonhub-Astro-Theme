export default async function main({ container }) {
  const logger = container.resolve("logger")
  const productModule = container.resolve("product")
  const scModule = container.resolve("sales_channel")

  const scs = await scModule.listSalesChannels({})
  logger.info(`Sales channels: ${JSON.stringify(scs.map(s => ({ id: s.id, name: s.name })))}`)

  const defaultSc = scs[0]
  if (!defaultSc) {
    logger.error("No sales channel found!")
    return
  }

  const allProducts = await productModule.listProducts({}, { take: 5000 })
  logger.info(`Total products: ${allProducts.length}`)

  const productsToAdd = allProducts.map(p => p.id)
  logger.info(`Adding ${productsToAdd.length} products to sales channel ${defaultSc.id}`)

  await scModule.addProductsToSalesChannel(defaultSc.id, productsToAdd)
  logger.info("Done! All products linked to sales channel.")
}
