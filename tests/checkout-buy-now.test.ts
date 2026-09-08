// @vitest-environment jsdom
/**
 * `/checkout?buy=…` boot contract — the only checkout-script path that was
 * not yet covered: a no-JS Buy Now anchor lands on checkout carrying the
 * whole payload in the URL, and the script must synthesise a one-line cart
 * that is detached from the shopper's stored bag. Uses the real SSR shell
 * (tests/fixtures/checkout-shell.html) so id-based selectors stay honest.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const shellPath = resolve(__dirname, "fixtures/checkout-shell.html");
const bodyHtml = readFileSync(shellPath, "utf-8")
  .replace(/^[\s\S]*?<body[^>]*>/, "")
  .replace(/<\/body>[\s\S]*$/, "");

async function flush(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = "";
  // jsdom lacks a few layout APIs the page may call; make them cheap no-ops.
  for (const el of [Element.prototype]) {
    if (
      typeof (el as unknown as { scrollIntoView?: unknown }).scrollIntoView !==
      "function"
    ) {
      (el as unknown as { scrollIntoView: () => void }).scrollIntoView =
        () => {};
    }
  }
});

describe("checkout boot — Buy Now deep link", () => {
  it("synthesises a one-line detached cart and leaves the stored bag alone", async () => {
    vi.resetModules();
    document.body.innerHTML = bodyHtml;
    window.history.replaceState(
      {},
      "",
      "/checkout?buy=var_asuna&qty=2&p=3400&t=Asuna%20%E2%80%94%20Stacia&h=asuna-stacia&v=1%2F7%20Scale%20Standard",
    );
    // A "bag" that must survive the whole flow untouched.
    window.localStorage.setItem("cartId", "cart_bag_1");
    window.localStorage.setItem(
      "toonhub_local_cart",
      JSON.stringify([
        { id: "bag-1", title: "Kaguya Figure", unit_price: 900, quantity: 3 },
      ]),
    );
    // Any accidental network call in the buy branch is a bug by design.
    const fetchSpy = vi.fn(() =>
      Promise.reject(new Error("network must not run")),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await import("../src/scripts/checkout");
    await flush();
    await flush();

    const lines = document.getElementById("coLines")!;
    expect(lines.textContent).toContain("Asuna — Stacia");
    expect(lines.textContent).toContain("1/7 Scale Standard");
    // Site-wide BOGO halves the second unit: $68 subtotal → $51 total.
    expect(document.getElementById("coTotal")!.textContent).toContain("51.00");

    // The stored bag + its remote cart id came through untouched.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("cartId")).toBe("cart_bag_1");
    expect(
      JSON.parse(window.localStorage.getItem("toonhub_local_cart") || "[]"),
    ).toHaveLength(1);
    expect(
      JSON.parse(window.localStorage.getItem("toonhub_local_cart") || "[]")[0]
        .title,
    ).toBe("Kaguya Figure");

    // Sanity for later assertions: the URL intent should be in view, not the bag.
    expect(lines.textContent).not.toContain("Kaguya Figure");
  });

  it("boots the normal bag flow when the URL is clean", async () => {
    vi.resetModules();
    document.body.innerHTML = bodyHtml;
    window.history.replaceState({}, "", "/checkout");
    window.localStorage.setItem(
      "toonhub_local_cart",
      JSON.stringify([
        { id: "bag-2", title: "Kaguya Figure", unit_price: 900, quantity: 2 },
      ]),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: false, json: async () => ({}) } as Response),
      ),
    );

    await import("../src/scripts/checkout");
    await flush();
    await flush();

    expect(document.getElementById("coLines")!.textContent).toContain(
      "Kaguya Figure",
    );
    // Same BOGO rule as the bag flow: $18 subtotal → $13.50.
    expect(document.getElementById("coTotal")!.textContent).toContain("13.50");
  });
});
