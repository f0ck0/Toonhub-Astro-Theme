import { FIGURES_HANDLE } from "./site"

const FIGURES_ID = "cat_figures"

type Demo = { name: string; handle: string; file: string; blurb: string }

const SERIES: Demo[] = [
  { name: "Demon Slayer", handle: "demon-slayer-100032", file: "demon-slayer.webp", blurb: "Tanjiro, Nezuko, the Hashira and more — premium sculpts from the Demon Slayer universe." },
  { name: "Jujutsu Kaisen", handle: "jujutsu-kaisen-100037", file: "jujutsu-kaisen.webp", blurb: "Gojo, Itadori, Sukuna and the jujutsu sorcerers in display-ready figures." },
  { name: "One Piece", handle: "one-piece-100029", file: "onepiece.webp", blurb: "Straw Hat crew and legends of the Grand Line." },
  { name: "Dragon Ball", handle: "dragon-ball-100030", file: "dragonball.webp", blurb: "Saiyans, gods and villains from Dragon Ball Z and Super." },
  { name: "Naruto", handle: "naruto-100031", file: "solo-leveling.webp", blurb: "Shinobi of the Hidden Leaf and the Akatsuki." },
  { name: "Attack on Titan", handle: "attack-on-titan-100041", file: "attack-on-titan.webp", blurb: "Survey Corps heroes and titans, sculpted for collectors." },
  { name: "Tokyo Ghoul", handle: "tokyo-ghoul-100043", file: "tokyo-ghoul.webp", blurb: "Kaneki and the ghouls of Tokyo." },
  { name: "My Hero Academia", handle: "my-hero-academia-100036", file: "my-hero-acadamia.webp", blurb: "Plus Ultra heroes and villains." },
  { name: "Sailor Moon", handle: "tokyo-revengers-100039", file: "sailor-moon.webp", blurb: "Guardians of the moon in premium figure form." },
  { name: "Gundam", handle: "digimon-100034", file: "gundam.webp", blurb: "Mobile suits and pilots from the Gundam saga." },
  { name: "Chainsaw Man", handle: "chainsaw-man-100042", file: "chainsaw-man.webp", blurb: "Devils, hunters and Makima." },
  { name: "Bleach", handle: "bleach-100035", file: "bleach.webp", blurb: "Soul Reapers and Espada." },
  { name: "Pokémon", handle: "pok-mon-100033", file: "pokemon.webp", blurb: "Catch display-ready Pokémon figures." },
  { name: "Black Clover", handle: "black-clover-100038", file: "black-clover.webp", blurb: "Magic knights of the Clover Kingdom." },
  { name: "Blue Lock", handle: "blue-lock", file: "blue-lock.webp", blurb: "Strikers from the Blue Lock project." },
  { name: "Evangelion", handle: "evangelion", file: "evangelion.webp", blurb: "Evas and pilots of NERV." },
  { name: "Fairy Tail", handle: "fairy-tail", file: "fairy-tail.webp", blurb: "Wizards of Fairy Tail." },
  { name: "Dandadan", handle: "dandadan", file: "dandadan.webp", blurb: "Ghosts, aliens and chaotic energy." },
]

function usd(amount: number) {
  return [{ currency_code: "usd", amount }]
}

function makeProduct(s: Demo, i: number) {
  const img = `/images/collection/${s.file}`
  const id = `prod_demo_${i}`
  return {
    id,
    handle: `${s.handle}-figure`,
    title: `${s.name.toUpperCase()} COLLECTOR FIGURE`,
    subtitle: `Premium ${s.name} display figure`,
    thumbnail: img,
    description: `<p>${s.blurb} High-quality materials, worldwide shipping, and our Buy 1 Get 2nd 50% off offer.</p>`,
    images: [{ url: img }, { url: img }],
    variants: [
      { id: `var_${i}_std`, title: "Standard", prices: usd(2900) },
      { id: `var_${i}_dx`, title: "Deluxe edition", prices: usd(3900) },
    ],
    categories: [{ id: `cat_${s.handle}`, name: s.name, handle: s.handle, parent_category_id: FIGURES_ID }],
  }
}

export const FALLBACK_PRODUCTS = SERIES.map(makeProduct)

export const FALLBACK_CATEGORIES = [
  { id: FIGURES_ID, name: "Figures", handle: FIGURES_HANDLE, parent_category_id: null, products: FALLBACK_PRODUCTS },
  ...SERIES.map((s, i) => ({
    id: `cat_${s.handle}`,
    name: s.name,
    handle: s.handle,
    parent_category_id: FIGURES_ID,
    description: s.blurb,
    products: [FALLBACK_PRODUCTS[i]],
  })),
]
