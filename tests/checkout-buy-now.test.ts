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
  it("synthesises a real one-line cart for Buy Now and leaves the stored bag alone", async () => {
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
    // Buy Now must materialise a real Medusa cart (payment methods depend on
    // it), so the network chain is stubbed: create cart → add line → checkout.
    const jsonRes = (body: unknown) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => body,
      } as Response);
    const checkoutCart = {
      id: "cart_buy_1",
      currency: "usd",
      items: [
        {
          id: "li_1",
          title: "Asuna — Stacia",
          variant_title: "1/7 Scale Standard",
          thumbnail: "",
          quantity: 2,
          unit_price: 3400,
        },
      ],
      subtotal: 6800,
      discount_total: 0,
      total: 6800,
    };
    const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method || "GET").toUpperCase();
      if (url === "/api/cart" && method === "POST") {
        return jsonRes({ cartId: "cart_buy_1" });
      }
      if (url === "/api/cart/add") {
        return jsonRes({ success: true });
      }
      if (url.startsWith("/api/checkout?action=config")) {
        return jsonRes({ stripeKey: "", paypalClientId: "" });
      }
      if (url.startsWith("/api/checkout?cartId=")) {
        return jsonRes({
          cart: checkoutCart,
          shipping_options: [],
          payment_providers: [],
        });
      }
      return jsonRes({});
    });
    vi.stubGlobal("fetch", fetchSpy);

    await import("../src/scripts/checkout");
    await flush();
    await flush();

    const lines = document.getElementById("coLines")!;
    // The buy-now intent is in view (not the stored bag), from the real cart.
    expect(lines.textContent).toContain("Asuna — Stacia");
    expect(lines.textContent).toContain("1/7 Scale Standard");
    expect(lines.textContent).not.toContain("Kaguya Figure");
    // $68 subtotal from the server cart, no discount in this stub.
    expect(document.getElementById("coTotal")!.textContent).toContain("68.00");

    // The fix: a real Medusa cart was created for the buy-now line.
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/cart",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
    // The checkout detached from the bag and now owns the new cart id.
    expect(window.localStorage.getItem("cartId")).toBe("cart_buy_1");
    // The stored bag itself is untouched.
    expect(
      JSON.parse(window.localStorage.getItem("toonhub_local_cart") || "[]"),
    ).toHaveLength(1);
    expect(
      JSON.parse(window.localStorage.getItem("toonhub_local_cart") || "[]")[0]
        .title,
    ).toBe("Kaguya Figure");
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
