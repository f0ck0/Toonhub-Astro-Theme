// @vitest-environment jsdom
/**
 * Bug-regression suite for the PDP buy/add buttons and the cart page:
 * the hidden-attribute/class mismatch that kept the filled cart invisible,
 * the buy-now deep-link checkout, and the terms-consent gate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseBuyNowLink } from "../src/scripts/lib/buy-now";

/** The cart page's SSR skeleton — verbatim hidden-attribute pattern. */
const CART_SURFACES = `
  <div data-cart-empty hidden>EMPTY</div>
  <div data-cart-filled hidden><ul data-cart-lines></ul></div>
  <div class="cart-summary" data-cart-summary hidden>
    <label><input type="checkbox" data-cart-agree aria-describedby="hint" /></label>
    <p id="hint" data-cart-agree-hint hidden>Hint</p>
    <a class="btn" href="/checkout" data-cart-checkout>Checkout now</a>
  </div>
  <p data-cart-nudge hidden>Nudge</p>
  <div id="cartOverlay" class="overlay" data-overlay hidden></div>
  <aside id="cartDrawer" aria-hidden="true" inert><ul data-cart-lines></ul></aside>
`;

const PDP_ADD_BUTTON = `
  <button type="button" data-action="add"
    data-variant-target
    data-variant-id="var_01"
    data-vtitle="Standard"
    data-title="Luffy Gear 5 Figure"
    data-handle="luffy-figure"
    data-thumbnail="https://cdn.example/luffy.webp"
    data-price="3400"
    data-qty="2">Add to cart</button>
`;

const PDP_BUY_NOW_ANCHOR = `
  <a href="/checkout?buy=var_01&qty=1&p=3400&t=Luffy%20Gear%205%20Figure&h=luffy-figure&v=Standard&i=https%3A%2F%2Fcdn.example%2Fluffy.webp"
    data-action="buynow" data-variant-target data-variant-id="var_01" data-title="Luffy Gear 5 Figure"
    data-handle="luffy-figure" data-thumbnail="https://cdn.example/luffy.webp" data-price="3400" data-qty="1">Buy Now</a>
`;

async function flush(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(async () => {
  window.localStorage.clear();
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("toggleHidden syncs the hidden attribute (cart page root cause)", () => {
  it("removes the boolean hidden attribute alongside the class", async () => {
    const { toggleHidden } = await import("../src/scripts/lib/dom");
    const el = document.createElement("div");
    el.hidden = true;
    toggleHidden(el, false);
    expect(el.hidden).toBe(false);
    expect(el.hasAttribute("hidden")).toBe(false);
    toggleHidden(el, true);
    expect(el.hidden).toBe(true);
  });
});

describe("PDP add-to-cart button (delegated handler in cart.ts)", () => {
  it("seeds the local cart and unhides every filled surface", async () => {
    document.body.innerHTML = CART_SURFACES + PDP_ADD_BUTTON;
    await import("../src/scripts/cart");
    await flush();

    const filled = document.querySelector<HTMLElement>("[data-cart-filled]")!;
    const summary = document.querySelector<HTMLElement>("[data-cart-summary]")!;
    const empty = document.querySelector<HTMLElement>("[data-cart-empty]")!;
    // Empty cart: the empty state is shown, everything else stays hidden.
    expect(empty.hidden).toBe(false);

    document.querySelector<HTMLButtonElement>("[data-action='add']")!.click();
    await flush();

    const stored = JSON.parse(
      window.localStorage.getItem("toonhub_local_cart") || "[]",
    ) as {
      title?: string;
      unit_price?: number;
      quantity?: number;
      variant_id?: string;
    }[];
    expect(stored).toHaveLength(1);
    expect(stored[0].variant_id).toBe("var_01");
    expect(stored[0].unit_price).toBe(3400);
    expect(stored[0].quantity).toBe(2);

    // THE regression: inert surfaces must leave their SSR-hidden state.
    expect(filled.hidden).toBe(false);
    expect(filled.getAttribute("aria-hidden")).toBeNull();
    expect(summary.hidden).toBe(false);

    // The line list got a real row, not skeletons.
    expect(filled.querySelector(".cart-line__title")?.textContent).toBe(
      "Luffy Gear 5 Figure",
    );

    // Drawer opened in "just added" mode.
    expect(
      document.getElementById("cartDrawer")?.classList.contains("open"),
    ).toBe(true);
  });
});

describe("PDP Buy Now anchor (goCheckout seeds then navigates)", () => {
  it("writes exactly one buy-now line before leaving the page", async () => {
    document.body.innerHTML = CART_SURFACES + PDP_BUY_NOW_ANCHOR;
    window.localStorage.setItem(
      "toonhub_local_cart",
      JSON.stringify([
        { id: "old-bag", title: "Old bag item", unit_price: 999, quantity: 1 },
      ]),
    );
    await import("../src/scripts/cart");
    await flush();

    document
      .querySelector<HTMLAnchorElement>("[data-action='buynow']")!
      .click();
    await flush();

    // jsdom cannot perform the navigation itself; assert the pre-nav seed.
    const stored = JSON.parse(
      window.localStorage.getItem("toonhub_local_cart") || "[]",
    ) as { title?: string }[];
    expect(stored.length).toBe(2);
    expect(stored.at(-1)?.title).toBe("Luffy Gear 5 Figure");
  });
});

describe("parseBuyNowLink — no-JS Buy Now contract", () => {
  it("parses the exact href the PDP writes", () => {
    const link = parseBuyNowLink(
      "?buy=var_01&qty=3&p=3400&t=Zoro%20Two%20Sword&h=zoro-figure&v=Standard&i=https%3A%2F%2Fcdn.example%2Fzoro.webp",
    );
    expect(link).toEqual({
      variantId: "var_01",
      variantTitle: "Standard",
      title: "Zoro Two Sword",
      handle: "zoro-figure",
      thumbnail: "https://cdn.example/zoro.webp",
      quantity: 3,
      unitPrice: 3400,
    });
  });

  it("returns null for junk so normal cart boot proceeds", () => {
    expect(parseBuyNowLink("")).toBeNull();
    expect(parseBuyNowLink("?buy=")).toBeNull();
    expect(parseBuyNowLink("?ref=promo")).toBeNull();
  });

  it("clamps absurd quantities and prices", () => {
    const link = parseBuyNowLink("?buy=v&qty=4000&p=-5");
    expect(link?.quantity).toBe(99);
    expect(link?.unitPrice).toBe(0);
  });

  it("upscales major-unit prices like the rest of the theme does", () => {
    expect(parseBuyNowLink("?buy=v&p=34")?.unitPrice).toBe(3400);
    expect(parseBuyNowLink("?buy=v&p=3499")?.unitPrice).toBe(3499);
  });
});

describe("cart line quantity + remove (scoped delegation still works)", () => {
  it("steps quantity up/down and removes lines from inside [data-cart-lines]", async () => {
    document.body.innerHTML = CART_SURFACES;
    window.localStorage.setItem(
      "toonhub_local_cart",
      JSON.stringify([
        { id: "l1", title: "Bag item", unit_price: 900, quantity: 2 },
      ]),
    );
    await import("../src/scripts/cart");
    await flush();

    // Re-query after every click: cart.ts re-renders line lists wholesale,
    // so handlers always fire on fresh nodes in a real browser.
    const query = <T extends HTMLElement>(sel: string) =>
      document.querySelector<T>(`[data-cart-lines] ${sel}`)!;

    expect(query<HTMLButtonElement>('[data-qty="1"]')).toBeTruthy();

    query<HTMLButtonElement>('[data-qty="1"]').click();
    await flush();
    let stored = JSON.parse(
      window.localStorage.getItem("toonhub_local_cart") || "[]",
    ) as {
      quantity?: number;
    }[];
    expect(stored[0].quantity).toBe(3);

    query<HTMLButtonElement>('[data-qty="-1"]').click();
    await flush();
    stored = JSON.parse(
      window.localStorage.getItem("toonhub_local_cart") || "[]",
    );
    expect(stored[0].quantity).toBe(2);

    query<HTMLButtonElement>("[data-remove]").click();
    await flush();
    stored = JSON.parse(
      window.localStorage.getItem("toonhub_local_cart") || "[]",
    );
    expect(stored).toHaveLength(0);
    // Emptying the cart flips the page back to the empty state.
    expect(
      document.querySelector<HTMLElement>("[data-cart-empty]")!.hidden,
    ).toBe(false);
  });
});

describe("cart page terms-of-service gate", () => {
  it("keeps checkout off until consent, explains itself, unlocks on tick", async () => {
    document.body.innerHTML = CART_SURFACES;
    window.localStorage.setItem(
      "toonhub_local_cart",
      JSON.stringify([
        { id: "l1", title: "Bag item", unit_price: 900, quantity: 1 },
      ]),
    );
    await import("../src/scripts/cart");
    await flush();

    const cta = document.querySelector<HTMLAnchorElement>(
      "[data-cart-checkout]",
    )!;
    const hint = document.querySelector<HTMLElement>("[data-cart-agree-hint]")!;
    const checkbox =
      document.querySelector<HTMLInputElement>("[data-cart-agree]")!;

    // Filled layout visible, checkout gated by the consent checkbox.
    expect(cta.getAttribute("aria-disabled")).toBe("true");
    expect(hint.hidden).toBe(true);

    // Clicking the gated CTA stays on the page and explains itself.
    cta.click();
    await flush();
    expect(hint.hidden).toBe(false);

    // Ticking the box clears the hint and unlocks the CTA.
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    expect(cta.getAttribute("aria-disabled")).toBe("false");
    expect(hint.hidden).toBe(true);
  });
});
