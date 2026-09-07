// @vitest-environment jsdom
/**
 * Regression: switching variants once overwrote the Add-to-Cart / Buy Now
 * button LABELS with the price (writePrice swept every [data-price] node —
 * and the PDP triggers carry data-price as their payload). The fixture
 * mirrors [id].astro's real triggerData + variant chips; pdp.ts is the
 * real module under test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const PDP_MARKUP = `
  <div data-variant-row>
    <button data-variant="var_budget" data-vtitle="Budget Edition" data-vprice="2800" aria-pressed="false">Budget</button>
    <button data-variant="var_dx" data-vtitle="DX Version" data-vprice="5600" aria-pressed="true">DX</button>
  </div>
  <div data-pdp-qty-row><input type="number" data-pdp-qty value="1" /></div>
  <span data-variant-price>From $28.00</span>
  <s data-variant-compare hidden>$56.00</s>
  <p class="pdp-sticky-price" data-variant-price>From $28.00</p>
  <button type="button" data-action="add" data-variant-target
    data-variant-id="var_dx" data-vtitle="DX Version" data-title="Zoro Figure"
    data-handle="zoro-figure" data-thumbnail="https://cdn/z.webp"
    data-price="5600" data-qty="1">Add to cart</button>
  <a href="/checkout?buy=var_dx&qty=1&p=5600&t=Zoro%20Figure&h=zoro-figure&v=DX%20Version"
    data-action="buynow" data-variant-target data-variant-id="var_dx"
    data-vtitle="DX Version" data-title="Zoro Figure" data-handle="zoro-figure"
    data-thumbnail="https://cdn/z.webp" data-price="5600" data-qty="1">Buy Now</a>
`;

async function flush(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("PDP variant switching mirrors price into slots, never into buttons", () => {
  it("keeps Add-to-Cart and Buy Now clickable labels after a chip switch", async () => {
    document.body.innerHTML = PDP_MARKUP;
    await import("../src/scripts/pdp");
    await flush();

    const addBtn = document.querySelector<HTMLButtonElement>(
      "[data-action='add']",
    )!;
    const buyBtn = document.querySelector<HTMLAnchorElement>(
      "[data-action='buynow']",
    )!;

    document
      .querySelector<HTMLButtonElement>("[data-variant='var_budget']")!
      .click();
    await flush();

    // THE regression assertion: labels survive variant switching.
    expect(addBtn.textContent?.trim()).toBe("Add to cart");
    expect(buyBtn.textContent?.trim()).toBe("Buy Now");

    // And the price mirrors go where they belong.
    expect(
      document.querySelector("[data-variant-price]")?.textContent,
    ).toContain("28.00");
    expect(document.querySelector(".pdp-sticky-price")?.textContent).toContain(
      "28.00",
    );
    const compare = document.querySelector<HTMLElement>(
      "[data-variant-compare]",
    )!;
    expect(compare.hidden).toBe(false);
    expect(compare.textContent).toContain("56.00");

    // Trigger payload tracks the chosen chip (minor units stay on the attr).
    expect(addBtn.dataset.variantId).toBe("var_budget");
    expect(addBtn.dataset.vtitle).toBe("Budget Edition");
    expect(addBtn.dataset.price).toBe("2800");
    expect(new URL(buyBtn.href).searchParams.get("buy")).toBe("var_budget");
    expect(new URL(buyBtn.href).searchParams.get("v")).toBe("Budget Edition");
    expect(new URL(buyBtn.href).searchParams.get("p")).toBe("2800");
  });
});
