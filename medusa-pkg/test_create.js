export default async function main({ container }) {
  const logger = container.resolve("logger")
  const moduleService = container.resolve("product")

  const testProduct = await moduleService.createProducts({
    title: "Test Image Product",
    handle: "test-image-product-999",
    description: "Test description",
    status: "published",
    weight: 400,
    thumbnail: "http://96.47.238.191:8888/images/products/305_872.jpg",
    images: [
      { url: "http://96.47.238.191:8888/images/products/305_872.jpg" },
      { url: "http://96.47.238.191:8888/images/products/305_873.jpg" },
    ],
    options: [{ title: "Default", values: ["Default"] }],
    variants: [{
      title: "Default",
      sku: "TEST-IMG-999",
      options: { Default: "Default" },
      prices: [{ amount: 1999, currency_code: "usd" }],
      manage_inventory: false,
    }],
  })

  logger.info(`Created product: ${testProduct.id}`)
  logger.info(`Thumbnail: ${testProduct.thumbnail}`)
  logger.info(`Images: ${JSON.stringify(testProduct.images)}`)

  const retrieved = await moduleService.retrieveProducts(testProduct.id, {
    relations: ["images", "variants", "variants.prices"],
  })
  logger.info(`Retrieved images: ${JSON.stringify(retrieved.images)}`)
  logger.info(`Retrieved variants: ${JSON.stringify(retrieved.variants?.map(v => ({ title: v.title, sku: v.sku, prices: v.prices })) )}`)

  await moduleService.deleteProducts([testProduct.id])
  logger.info("Test product deleted")
}
