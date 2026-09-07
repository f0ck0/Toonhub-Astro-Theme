/**
 * Source-level contract test between the PDP's SSR markup, the delegated
 * cart click handler, and the checkout deep-link parser. The `data-*`
 * attribute names and `?buy=` parameter names are an interface shared by
 * three files — a silent rename on either side breaks add-to-cart or the
 * no-JS Buy Now link without any type error (the original bug).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBuyNowLink } from "../src/scripts/lib/buy-now";

const pdp = readFileSync(
  resolve(__dirname, "../src/pages/products/[id].astro"),
  "utf-8",
);
const cart = readFileSync(
  resolve(__dirname, "../src/scripts/cart.ts"),
  "utf-8",
);
const sync = readFileSync(resolve(__dirname, "../src/scripts/pdp.ts"), "utf-8");

/** Attributes `payloadFromTrigger()` in cart.ts reads off the click target. */
const TRIGGER_ATTRS = [
  "data-variant-id",
  "data-vtitle",
  "data-title",
  "data-handle",
  "data-thumbnail",
  "data-price",
  "data-qty",
];

/** Query params `parseBuyNowLink()` expects on the no-JS Buy Now href. */
const BUY_PARAMS = ["buy", "qty", "p", "t", "h", "v", "i"];

describe("PDP ↔ cart/ts click-handler contract", () => {
  it("the page ships every data-* attribute payloadFromTrigger consumes", () => {
    for (const attr of TRIGGER_ATTRS) {
      expect(pdp, `[id].astro is missing ${attr}`).toContain(`"${attr}"`);
    }
  });

  it("cart.ts reads the same dataset keys the page emits", () => {
    const datasetReads = [...cart.matchAll(/el\.dataset\.(\w+)/g)].map(
      (m) => m[1],
    );
    for (const key of [
      "variantId",
      "vtitle",
      "title",
      "handle",
      "thumbnail",
      "price",
      "qty",
    ]) {
      expect(datasetReads, `cart.ts no longer reads dataset.${key}`).toContain(
        key,
      );
    }
  });

  it("quantity delegation stays scoped to rendered cart lines, never bare [data-qty]", () => {
    expect(cart).toContain("[data-cart-lines] [data-qty]");
    // A bare closest() on the delegated handler is exactly the PDP killer bug.
    const bare = cart.match(/closest[^(]*\(\s*[`'"]\[data-qty\][`'"]\s*\)/);
    expect(
      bare,
      "bare [data-qty] closest() reintroduced — PDP add/buy will die",
    ).toBeNull();
  });

  it("variant chips mirror their state into the add/buy triggers (pdp.ts)", () => {
    expect(sync).toContain("trigger.dataset.variantId = variantId");
    expect(sync).toContain("trigger.dataset.vtitle = variantTitle");
    expect(sync).toContain("trigger.dataset.price");
    expect(sync).toContain("trigger.dataset.qty");
  });
});

describe("PDP ↔ checkout deep-link contract", () => {
  it("the SSR buyHref emits every param parseBuyNowLink expects", () => {
    for (const param of BUY_PARAMS) {
      const key = `${param === "buy" ? "buy" : param}:`;
      expect(pdp, `buyHref() no longer emits ${param}`).toContain(key);
    }
  });

  it("price mirroring never sweeps [data-price] nodes (button labels survive)", () => {
    // The historical bug: writePrice wrote sale text into every [data-price]
    // element — PDP triggers carry data-price as payload → labels became "$34".
    const sweep = sync.match(/\$\$<[^(]*\(\s*[`'"]\[data-price\][`'"]/);
    expect(sweep, "pdp.ts must never text-sweep bare [data-price]").toBeNull();
    // Sticky-bar price slot uses the exclusive data-variant-price contract.
    expect(pdp).toContain('class="pdp-sticky-price" data-variant-price');
  });

  it("pdp.ts keeps the href honest when variant/quantity changes", () => {
    expect(sync).toContain('url.searchParams.set("buy", variantId)');
    expect(sync).toContain('url.searchParams.set("v", variantTitle)');
    expect(sync).toContain('url.searchParams.set("qty"');
    expect(sync).toContain('url.searchParams.set("p"');
  });

  it("end-to-end: a generated buyHref parses back without loss", () => {
    // Mirrors buyHref() in [id].astro exactly — if the page drifts, the
    // source assertions above fire; this guards the parser side.
    const params = new URLSearchParams({
      buy: "var_7",
      qty: "2",
      p: "3400",
      t: "Ace Figure — Fire Fist",
      h: "ace-figure",
      v: "Standard",
      i: "https://cdn.example/ace.webp",
    });
    const intent = parseBuyNowLink(
      `/checkout?${params.toString()}`.replace(/^[^?]*/, ""),
    );
    expect(intent).toEqual({
      variantId: "var_7",
      variantTitle: "Standard",
      title: "Ace Figure — Fire Fist",
      handle: "ace-figure",
      thumbnail: "https://cdn.example/ace.webp",
      quantity: 2,
      unitPrice: 3400,
    });
  });
});
