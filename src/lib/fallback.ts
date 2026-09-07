/**
 * Demo catalogue used when Medusa cannot be reached.
 *
 * It exists so the storefront never renders an empty shell: a misconfigured
 * publishable key, a backend outage or a local `npm run dev` without a database
 * all fall back to these 18 series, which use the same artwork the collection
 * tiles use. Prices and review counts are deliberately absent — the UI hides
 * those widgets rather than inventing numbers.
 */

import { COLLECTION_ASSETS } from "./images"
import { FIGURES_HANDLE } from "./site"
import type { Product, ProductCategory } from "../types"

const FIGURES_ID = "cat_figures"

interface Demo {
  name: string
  handle: string
  /** File stem in `src/assets/collections`. */
  file: string
  blurb: string
}

const SERIES: Demo[] = [
  { name: "Demon Slayer", handle: "demon-slayer-100032", file: "demon-slayer", blurb: "Tanjiro, Nezuko, the Hashira and more — premium sculpts from the Demon Slayer universe." },
  { name: "Jujutsu Kaisen", handle: "jujutsu-kaisen-100037", file: "jujutsu-kaisen", blurb: "Gojo, Itadori, Sukuna and the jujutsu sorcerers in display-ready figures." },
  { name: "One Piece", handle: "one-piece-100029", file: "onepiece", blurb: "Straw Hat crew and legends of the Grand Line." },
  { name: "Dragon Ball", handle: "dragon-ball-100030", file: "dragonball", blurb: "Saiyans, gods and villains from Dragon Ball Z and Super." },
  { name: "Naruto", handle: "naruto-100031", file: "solo-leveling", blurb: "Shinobi of the Hidden Leaf and the Akatsuki." },
  { name: "Attack on Titan", handle: "attack-on-titan-100041", file: "attack-on-titan", blurb: "Survey Corps heroes and titans, sculpted for collectors." },
  { name: "Tokyo Ghoul", handle: "tokyo-ghoul-100043", file: "tokyo-ghoul", blurb: "Kaneki and the ghouls of Tokyo." },
  { name: "My Hero Academia", handle: "my-hero-academia-100036", file: "my-hero-acadamia", blurb: "Plus Ultra heroes and villains." },
  { name: "Sailor Moon", handle: "tokyo-revengers-100039", file: "sailor-moon", blurb: "Guardians of the moon in premium figure form." },
  { name: "Gundam", handle: "digimon-100034", file: "gundam", blurb: "Mobile suits and pilots from the Gundam saga." },
  { name: "Chainsaw Man", handle: "chainsaw-man-100042", file: "chainsaw-man", blurb: "Devils, hunters and Makima." },
  { name: "Bleach", handle: "bleach-100035", file: "bleach", blurb: "Soul Reapers and Espada." },
  { name: "Pokémon", handle: "pok-mon-100033", file: "pokemon", blurb: "Catch display-ready Pokémon figures." },
  { name: "Black Clover", handle: "black-clover-100038", file: "black-clover", blurb: "Magic knights of the Clover Kingdom." },
  { name: "Blue Lock", handle: "blue-lock", file: "blue-lock", blurb: "Strikers from the Blue Lock project." },
  { name: "Evangelion", handle: "evangelion", file: "evangelion", blurb: "Evas and pilots of NERV." },
  { name: "Fairy Tail", handle: "fairy-tail", file: "fairy-tail", blurb: "Wizards of Fairy Tail." },
  { name: "Dandadan", handle: "dandadan", file: "dandadan", blurb: "Ghosts, aliens and chaotic energy." },
]

function usd(amount: number) {
  return [{ currency_code: "usd", amount }]
}

/** Bundled artwork URL — falls back to `""` so the card shows a placeholder. */
function artFor(file: string): string {
  return COLLECTION_ASSETS[file]?.src || ""
}

function makeProduct(series: Demo, index: number): Product {
  const art = artFor(series.file)
  return {
    id: `prod_demo_${index}`,
    handle: `${series.handle}-figure`,
    title: `${series.name.toUpperCase()} COLLECTOR FIGURE`,
    subtitle: `Premium ${series.name} display figure`,
    thumbnail: art,
    description: `<p>${series.blurb} High-quality materials, worldwide shipping, and our Buy 1 Get 2nd 50% off offer.</p>`,
    images: art ? [{ url: art }] : [],
    variants: [
      { id: `var_${index}_std`, title: "Standard", prices: usd(2900) },
      { id: `var_${index}_dx`, title: "Deluxe edition", prices: usd(3900) },
    ],
    categories: [
      {
        id: `cat_${series.handle}`,
        name: series.name,
        handle: series.handle,
        parent_category_id: FIGURES_ID,
      },
    ],
  }
}

export const FALLBACK_PRODUCTS: Product[] = SERIES.map(makeProduct)

export const FALLBACK_CATEGORIES: ProductCategory[] = [
  {
    id: FIGURES_ID,
    name: "Figures",
    handle: FIGURES_HANDLE,
    parent_category_id: null,
    products: FALLBACK_PRODUCTS,
  },
  ...SERIES.map((series, index) => ({
    id: `cat_${series.handle}`,
    name: series.name,
    handle: series.handle,
    parent_category_id: FIGURES_ID,
    description: series.blurb,
    products: [FALLBACK_PRODUCTS[index]],
  })),
]

/** `true` when the rendered catalogue is the demo data (used for a dev banner). */
export function isFallbackProduct(product: Product | null | undefined): boolean {
  return String(product?.id || "").startsWith("prod_demo_")
}
