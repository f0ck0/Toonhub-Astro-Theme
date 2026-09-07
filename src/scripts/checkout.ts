/**
 * Checkout page behaviour: country/province selection, express-pay toggling,
 * address -> payment -> review stepping and the order-summary totals.
 *
 * UI strings arrive through the form's `data-checkout-messages` attribute so
 * this module stays language-agnostic (server-rendered copy is already in the
 * markup). Summary rows are built as HTML strings, so every interpolated value
 * is escaped — cart titles come from the catalogue (or from a `?t=` deep link)
 * and must never be able to inject markup.
 */
import {
  provincesOf,
  countryFromCurrency,
  countryFromTimezone,
  COUNTRIES,
  countryName,
} from "../lib/regions";
import { parseBuyNowLink } from "./lib/buy-now";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface CheckoutMessages {
  emptyCart: string;
  processing: string;
  payNow: string;
  placeOrder: string;
  placeOrderFree: string;
  errCountry: string;
  errProvince: string;
  failed: string;
  unavailable: string;
  paymentIncomplete: string;
  requestFailed: string;
  qtyEach: string; // "Qty {qty} · {price} each"
  free: string;
  shipLineDefault: string;
  shippingNameFallback: string;
  provincePh: string;
  provinceSelectFirst: string;
  countryOtherFallback: string;
}

/** One order-summary line, as returned by `/api/checkout` or `toonhub_local_cart`. */
interface SummaryLine {
  id?: string;
  title?: string;
  variant_title?: string;
  thumbnail?: string;
  quantity?: number;
  unit_price?: number;
}

interface LocalCart {
  id?: string;
  email?: string;
  currency?: string;
  total?: number;
  subtotal?: number;
  shipping_total?: number;
  discount_total?: number;
  items?: SummaryLine[];
}

interface ShippingOptionLike {
  id?: string;
  name?: string;
  amount?: number | null;
  calculated_price?: {
    calculated_amount?: number | null;
    original_amount?: number | null;
  } | null;
}

interface PaymentProviderLike {
  id: string;
  label: string;
}

interface CheckoutConfig {
  stripeKey?: string;
  paypalClientId?: string;
}

interface CartApiResponse {
  cart?: LocalCart;
  shipping_options?: ShippingOptionLike[];
  payment_providers?: PaymentProviderLike[];
}

interface PaySession {
  id?: string;
  provider_id?: string;
  data?: unknown;
}

interface StripeElementLike {
  mount(selector: string): void;
  on(
    event: string,
    handler: (e: { error?: { message?: string } }) => void,
  ): void;
}

interface StripeLike {
  elements(): { create(type: string, options?: unknown): StripeElementLike };
  confirmCardPayment(
    clientSecret: string,
    options?: unknown,
  ): Promise<{ error?: { message?: string } }>;
}

const MSG: CheckoutMessages = (() => {
  try {
    const raw = document
      .getElementById("coForm")
      ?.getAttribute("data-checkout-messages");
    if (raw) return JSON.parse(raw) as CheckoutMessages;
  } catch {
    /* fall through */
  }
  return {} as CheckoutMessages;
})();

function msg(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return String(template || "").replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m,
  );
}

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  const text = String(err ?? "").trim();
  return text || fallback;
}

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

const form = document.getElementById("coForm") as HTMLFormElement;
const countrySelect = document.getElementById(
  "countrySelect",
) as HTMLSelectElement;
const provinceSelect = document.getElementById(
  "provinceSelect",
) as HTMLSelectElement;
let cartId = "";
let cart: LocalCart | null = null;
let providers: PaymentProviderLike[] = [];
let shipping: ShippingOptionLike[] = [];
let stripe: StripeLike | null = null;
let cardEl: StripeElementLike | null = null;
let stripeKey = "";
let selectedPay = "";

const fmt = (n: number, c = "usd") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (c || "usd").toUpperCase(),
    }).format((n || 0) / 100);
  } catch {
    return `$${((n || 0) / 100).toFixed(2)}`;
  }
};

function cookieCurrency() {
  try {
    const m = document.cookie.match(/(?:^|; )toonhub_currency=([^;]+)/);
    return (m ? decodeURIComponent(m[1]) : "usd").toLowerCase();
  } catch {
    return "usd";
  }
}

function showError(message: string) {
  const el = document.getElementById("coError")!;
  el.hidden = !message;
  el.textContent = message;
}

const provinceText = document.getElementById(
  "provinceText",
) as HTMLInputElement;
const countryOther = document.getElementById(
  "countryOther",
) as HTMLInputElement;
const countryOtherRow = document.getElementById(
  "countryOtherRow",
) as HTMLElement;
const COUNTRY_SET = new Set(COUNTRIES.map((c) => c.code));

function syncCountryExtra() {
  const other = countrySelect.value === "OTHER";
  countryOtherRow.hidden = !other;
  countryOther.required = other;
  if (!other) countryOther.value = "";
}

function fillProvinces(country: string, selected = "") {
  syncCountryExtra();
  const list = provincesOf(country);
  if (!list.length) {
    provinceSelect.hidden = true;
    provinceSelect.required = false;
    provinceSelect.innerHTML = `<option value="">${esc(MSG.provincePh)}</option>`;
    provinceSelect.value = "";
    provinceText.hidden = false;
    provinceText.value = selected;
    return;
  }
  provinceText.hidden = true;
  provinceText.value = "";
  provinceSelect.hidden = false;
  provinceSelect.required = true;
  provinceSelect.innerHTML =
    `<option value="">${esc(MSG.provinceSelectFirst)}</option>` +
    list
      .map(
        (p) =>
          `<option value="${p.code}" ${p.code === selected || p.name === selected ? "selected" : ""}>${esc(p.name)}</option>`,
      )
      .join("");
}

function findPayUrl(obj: unknown, depth = 0): string | null {
  if (!obj || depth > 5) return null;
  if (typeof obj === "string" && /^https?:\/\//.test(obj)) return obj;
  if (typeof obj !== "object") return null;
  const record = obj as Record<string, unknown> & {
    links?: { rel?: string; href?: string }[];
  };
  if (typeof record.url === "string") return record.url;
  if (record.approval_url && typeof record.approval_url === "string")
    return record.approval_url;
  if (Array.isArray(record.links)) {
    const a = record.links.find(
      (l) => /approve|payer-action|redirect/i.test(l?.rel || "") || l?.href,
    );
    if (a?.href) return a.href;
  }
  for (const v of Object.values(record)) {
    if (v && typeof v === "object") {
      const u = findPayUrl(v, depth + 1);
      if (u) return u;
    }
  }
  return null;
}

function bogo(items: SummaryLine[]): number {
  const units: number[] = [];
  for (const it of items)
    for (let i = 0; i < (it.quantity || 1); i++)
      units.push(Number(it.unit_price) || 0);
  units.sort((a, b) => b - a);
  let d = 0;
  for (let i = 0; i + 1 < units.length; i += 2)
    d += Math.round(Math.min(units[i], units[i + 1]) * 0.5);
  return d;
}

function shipAmount(s: ShippingOptionLike): number {
  const n = Number(
    s?.amount ??
      s?.calculated_price?.calculated_amount ??
      s?.calculated_price?.original_amount ??
      0,
  );
  return Number.isFinite(n) ? n : 0;
}

/** Ignore Medusa placeholder rates like 0.1 / $0.10 until real options are configured. */
function isConfiguredShip(s: ShippingOptionLike): boolean {
  const n = shipAmount(s);
  if (!n) return true;
  if (n > 0 && n < 1) return false;
  if (n > 0 && n <= 10) return false;
  return true;
}

function liveShipping(): ShippingOptionLike[] {
  return (shipping || []).filter(isConfiguredShip);
}

function renderSummary() {
  const items = cart?.items || [];
  const currency = cart?.currency || cookieCurrency();
  const box = document.getElementById("coLines")!;
  box.innerHTML =
    items
      .map((i: SummaryLine) => {
        const qty = Number(i.quantity) || 0;
        const unit = Number(i.unit_price) || 0;
        const label = esc(i.title || "Item");
        const thumb = i.thumbnail
          ? `<img class="co-thumb" src="${esc(i.thumbnail)}" alt="${label}" width="64" height="64" loading="lazy" decoding="async" />`
          : `<div class="co-thumb" role="img" aria-label="${label}"></div>`;
        return `
    <div class="co-line">
      <div style="position:relative;flex-shrink:0">
        ${thumb}
        <span class="co-qty">${qty}</span>
      </div>
      <div class="co-title">
        ${label}
        ${i.variant_title ? `<div style="font-weight:400;color:#888;font-size:0.78rem;text-transform:none;margin-top:4px;">${esc(i.variant_title)}</div>` : ""}
        <div class="co-qty-price">${esc(msg(MSG.qtyEach, { qty, price: fmt(unit, currency) }))}</div>
      </div>
      <div class="co-price">${fmt(unit * qty, currency)}</div>
    </div>
  `;
      })
      .join("") ||
    `<p style="color:#888;font-size:0.9rem;">${esc(MSG.emptyCart)}</p>`;
  const sum =
    cart?.subtotal ??
    items.reduce(
      (total: number, i: SummaryLine) =>
        total + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0),
      0,
    );
  const disc = cart?.discount_total || bogo(items);
  document.getElementById("coSub")!.textContent = fmt(sum, currency);
  const live = liveShipping();
  const shipRaw = Number(cart?.shipping_total || 0);
  const shipIsDummy = shipRaw > 0 && (shipRaw < 1 || shipRaw <= 10);
  const shipTxt =
    !live.length || !shipRaw || shipIsDummy ? MSG.free : fmt(shipRaw, currency);
  document.getElementById("coShip")!.textContent = shipTxt;
  const row = document.getElementById("coDiscRow")!;
  row.hidden = !disc;
  if (disc)
    document.getElementById("coDisc")!.textContent = `−${fmt(disc, currency)}`;
  const totalBase = shipIsDummy
    ? Math.max(0, sum - disc)
    : (cart?.total ?? Math.max(0, sum - disc));
  const totalTxt = fmt(totalBase, currency);
  document.getElementById("coTotal")!.textContent = totalTxt;
  const mini = document.getElementById("coTotalMini");
  if (mini) mini.textContent = totalTxt;
}

function renderShipping() {
  const box = document.getElementById("shipList")!;
  const live = liveShipping();
  if (!live.length) {
    box.textContent = MSG.shipLineDefault;
    return;
  }
  const first = live[0];
  const amt = shipAmount(first);
  if (live.length === 1) {
    box.innerHTML = `${esc(first.name || MSG.shippingNameFallback)} · <strong>${!amt ? esc(MSG.free) : fmt(amt, cart?.currency)}</strong>
      <input type="hidden" name="ship" value="${esc(first.id || "")}" />`;
    return;
  }
  box.innerHTML = live
    .map((s, i) => {
      const n = shipAmount(s);
      return `
    <label class="co-ship-opt">
      <span><input type="radio" name="ship" value="${esc(s.id || "")}" ${i === 0 ? "checked" : ""} /> ${esc(s.name || s.id || "")}</span>
      <strong>${!n ? esc(MSG.free) : fmt(n, cart?.currency)}</strong>
    </label>`;
    })
    .join("");
}

function renderPay() {
  const reserved = document.getElementById("payReserved")!;
  const box = document.getElementById("payList")!;
  const btn = document.getElementById("payBtn") as HTMLButtonElement;
  if (!providers.length) {
    reserved.hidden = false;
    box.hidden = true;
    btn.textContent = MSG.placeOrderFree;
    selectedPay = "";
    return;
  }
  reserved.hidden = true;
  box.hidden = false;
  box.innerHTML = providers
    .map(
      (p, i) => `
    <label class="${i === 0 ? "is-on" : ""}" data-pay="${esc(p.id)}">
      <input type="radio" name="pay" value="${esc(p.id)}" ${i === 0 ? "checked" : ""} />
      <span>${esc(p.label)}</span>
    </label>
  `,
    )
    .join("");
  selectedPay = providers[0]?.id || "";
  btn.textContent = /paypal|stripe|card/i.test(selectedPay)
    ? MSG.payNow
    : MSG.placeOrder;
  toggleCard();
  box.querySelectorAll("label").forEach((lab) => {
    lab.addEventListener("click", () => {
      box.querySelectorAll("label").forEach((x) => x.classList.remove("is-on"));
      lab.classList.add("is-on");
      selectedPay = lab.getAttribute("data-pay") || "";
      toggleCard();
    });
  });
}

function toggleCard() {
  const isCard = /stripe|card/i.test(selectedPay);
  const box = document.getElementById("cardBox") as HTMLElement;
  box.hidden = !isCard;
  if (isCard && stripe && !cardEl) {
    const elements = stripe.elements();
    cardEl = elements.create("card", {
      hidePostalCode: true,
      style: {
        base: {
          fontSize: "16px",
          color: "#fff",
          iconColor: "#fff",
          "::placeholder": { color: "#888" },
        },
      },
    });
    cardEl.mount("#card-element");
    cardEl.on("change", (e) => {
      document.getElementById("card-errors")!.textContent =
        e.error?.message || "";
    });
  }
}

interface ApiResponse {
  cart?: LocalCart;
  session?: PaySession;
  order?: { id?: string; display_id?: string | number; email?: string };
  error?: string;
}

async function api(
  action: string,
  extra: Record<string, unknown> = {},
): Promise<ApiResponse> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, cartId, ...extra }),
  });
  const data = (await res.json()) as ApiResponse;
  if (!res.ok) throw new Error(data.error || MSG.requestFailed);
  if (data.cart) cart = data.cart;
  return data;
}

interface FormPayload {
  email: string;
  name: string;
  address: string;
  apartment: string;
  city: string;
  postal: string;
  country: string;
  countryOther: string;
  province: string;
  phone: string;
  newsletter: boolean;
}

function formPayload(): FormPayload {
  const fd = new FormData(form);
  return {
    email: String(fd.get("email") || "").trim(),
    name: String(fd.get("name") || "").trim(),
    address: String(fd.get("address") || ""),
    apartment: String(fd.get("apartment") || ""),
    city: String(fd.get("city") || ""),
    postal: String(fd.get("postal") || ""),
    country: String(fd.get("country") || "US"),
    countryOther: String(fd.get("countryOther") || "").trim(),
    province: String(fd.get("province") || fd.get("provinceText") || ""),
    phone: String(fd.get("phone") || ""),
    newsletter: true,
  };
}

function persistAddress() {
  try {
    localStorage.setItem("toonhub_checkout", JSON.stringify(formPayload()));
  } catch {
    /* noop */
  }
}

function showOptional(id: string, on: boolean) {
  const el = document.getElementById(id);
  if (el) el.hidden = !on;
}

function setCompact(on: boolean) {
  const box = document.getElementById("savedBox")!;
  const fields = document.getElementById("addrFields")!;
  box.hidden = !on;
  fields.hidden = on;
  if (on) {
    const p = formPayload();
    document.getElementById("savedName")!.textContent = p.name;
    const countryLabel =
      p.country === "OTHER"
        ? p.countryOther || MSG.countryOtherFallback
        : countryName(p.country);
    document.getElementById("savedLine")!.textContent = [
      p.address,
      p.city,
      p.postal,
      countryLabel,
    ]
      .filter(Boolean)
      .join(", ");
    document.getElementById("savedMail")!.textContent = p.email;
  }
}

function restoreAddress() {
  let saved: Partial<FormPayload> = {};
  try {
    saved = JSON.parse(
      localStorage.getItem("toonhub_checkout") || "{}",
    ) as Partial<FormPayload>;
  } catch {
    saved = {};
  }
  const email = saved.email || localStorage.getItem("toonhub_email") || "";
  if (email)
    (form.querySelector('[name="email"]') as HTMLInputElement).value = email;
  if (saved.name)
    (form.querySelector('[name="name"]') as HTMLInputElement).value =
      saved.name;
  (["address", "apartment", "city", "postal", "phone"] as const).forEach(
    (k) => {
      if (saved[k])
        (form.querySelector(`[name="${k}"]`) as HTMLInputElement).value = saved[
          k
        ] as string;
    },
  );
  if (saved.apartment) {
    showOptional("aptRow", true);
    const t = document.getElementById("toggleApt");
    if (t) t.hidden = true;
  }
  if (saved.phone) {
    showOptional("phoneRow", true);
    const t = document.getElementById("togglePhone");
    if (t) t.hidden = true;
  }
  const guessed =
    countryFromTimezone() || countryFromCurrency(cookieCurrency());
  const country = saved.country || guessed;
  if (country === "OTHER" || (country && !COUNTRY_SET.has(country))) {
    countrySelect.value = "OTHER";
  } else {
    countrySelect.value = COUNTRY_SET.has(country) ? country : "US";
  }
  fillProvinces(countrySelect.value, saved.province || "");
  if (countrySelect.value === "OTHER") {
    countryOther.value =
      saved.countryOther || (!COUNTRY_SET.has(country) ? String(country) : "");
  }
  const needsProv = provincesOf(countrySelect.value).length > 0;
  const complete = Boolean(
    saved.email &&
    saved.name &&
    saved.address &&
    saved.city &&
    saved.postal &&
    (!needsProv || saved.province),
  );
  setCompact(complete);
  if (!email) document.getElementById("coEmail")?.focus();
  else if (!complete) document.getElementById("coName")?.focus();
}

async function saveAddress() {
  const p = formPayload();
  persistAddress();
  if (!cartId || !p.email || !p.address) return;
  await api("update", p as unknown as Record<string, unknown>);
  const shipId = (
    form.querySelector(
      'input[name="ship"]:checked, input[name="ship"][type="hidden"]',
    ) as HTMLInputElement | null
  )?.value;
  const chosen = liveShipping().find((s) => s.id === shipId);
  if (shipId && chosen) await api("shipping", { optionId: shipId });
  renderSummary();
}

function snapshotLocal(email: string) {
  const items = cart?.items || [];
  const order = {
    id: "TH" + Date.now().toString(36).toUpperCase(),
    email,
    created: new Date().toISOString(),
    items: items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
    total: cart?.total || 0,
  };
  try {
    const prev = JSON.parse(
      localStorage.getItem("toonhub_orders") || "[]",
    ) as unknown[];
    prev.unshift(order);
    localStorage.setItem("toonhub_orders", JSON.stringify(prev.slice(0, 20)));
  } catch {
    /* noop */
  }
  return order;
}

async function completeOrder() {
  const data = await api("complete");
  if (data.order) {
    try {
      localStorage.removeItem("cartId");
      localStorage.removeItem("toonhub_local_cart");
    } catch {
      /* noop */
    }
    const id = data.order.display_id || data.order.id;
    window.location.href = `/checkout/success?order=${encodeURIComponent(String(id || ""))}&email=${encodeURIComponent(data.order.email || "")}`;
    return;
  }
  throw new Error(MSG.paymentIncomplete);
}

async function payFlow(providerId: string) {
  showError("");
  const btn = document.getElementById("payBtn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = MSG.processing;
  const p = formPayload();
  try {
    await saveAddress();
    const local = snapshotLocal(p.email);
    if (providerId && cartId) {
      const data = await api("pay", { providerId });
      const session = data.session;
      const sessionData = session?.data as Record<string, unknown> | undefined;
      const secret = (sessionData?.client_secret ??
        sessionData?.clientSecret) as string | undefined;
      if (secret && stripe) {
        const result = await stripe.confirmCardPayment(secret, {
          payment_method: { card: cardEl },
        });
        if (result.error) throw new Error(result.error.message);
      }
      const redirect = findPayUrl(session?.data);
      if (redirect && /paypal/i.test(providerId)) {
        window.location.href = redirect;
        return;
      }
      await completeOrder();
      return;
    }
    if (cartId) {
      try {
        await completeOrder();
        return;
      } catch {
        /* no payment provider yet */
      }
    }
    window.location.href = `/checkout/success?order=${encodeURIComponent(local.id)}&email=${encodeURIComponent(p.email)}`;
  } catch (e) {
    showError(errMessage(e, MSG.failed));
    btn.disabled = false;
    btn.textContent = providers.length ? MSG.payNow : MSG.placeOrderFree;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (countrySelect.value === "OTHER" && !countryOther.value.trim()) {
    showError(MSG.errCountry);
    countryOther.focus();
    return;
  }
  if (provinceSelect.required && !provinceSelect.value) {
    showError(MSG.errProvince);
    provinceSelect.focus();
    return;
  }
  await payFlow(selectedPay);
});

countrySelect.addEventListener("change", () =>
  fillProvinces(countrySelect.value),
);
document
  .getElementById("editAddr")
  ?.addEventListener("click", () => setCompact(false));
document.getElementById("toggleApt")?.addEventListener("click", () => {
  showOptional("aptRow", true);
  (document.getElementById("toggleApt") as HTMLElement).hidden = true;
  form.querySelector<HTMLInputElement>('[name="apartment"]')?.focus();
});
document.getElementById("togglePhone")?.addEventListener("click", () => {
  showOptional("phoneRow", true);
  (document.getElementById("togglePhone") as HTMLElement).hidden = true;
  form.querySelector<HTMLInputElement>('[name="phone"]')?.focus();
});

document.getElementById("discountBtn")?.addEventListener("click", async () => {
  const code = (
    document.getElementById("discountCode") as HTMLInputElement
  ).value.trim();
  if (!code) return;
  try {
    await api("discount", { code });
    renderSummary();
  } catch (e) {
    showError(errMessage(e, MSG.failed));
  }
});

async function boot() {
  restoreAddress();

  /*
   * Buy-Now deep link (`/checkout?buy=…`): the PDP anchor works without JS,
   * so this URL may be the ONLY payload we have. It describes one explicitly
   * chosen line — honour it ahead of any stored bag, and detach from the bag
   * cart id so a later `complete` can never wipe/ship the wrong contents. The
   * stored bag itself stays untouched in localStorage for when the shopper
   * returns.
   */
  const buyNow = parseBuyNowLink(window.location.search);
  if (buyNow) {
    cartId = "";
    cart = {
      items: [
        {
          id: buyNow.variantId || "buy-now",
          title: buyNow.title || "Item",
          variant_title: buyNow.variantTitle,
          thumbnail: buyNow.thumbnail,
          quantity: buyNow.quantity,
          unit_price: buyNow.unitPrice,
        },
      ],
      currency: cookieCurrency(),
      subtotal: buyNow.unitPrice * buyNow.quantity,
    };
    renderSummary();
    renderShipping();
    renderPay();
    return;
  }

  cartId = localStorage.getItem("cartId") || "";
  let localItems: SummaryLine[] = [];
  try {
    localItems = JSON.parse(
      localStorage.getItem("toonhub_local_cart") || "[]",
    ) as SummaryLine[];
  } catch {
    localItems = [];
  }

  if (cartId) {
    try {
      const cfg = (await fetch("/api/checkout?action=config").then((r) =>
        r.json(),
      )) as CheckoutConfig;
      stripeKey = cfg.stripeKey || "";
      if (stripeKey) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://js.stripe.com/v3/";
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.head.appendChild(s);
        }).catch(() => {
          /* Stripe optional */
        });
        const stripeGlobal = (
          window as unknown as { Stripe?: (key: string) => StripeLike }
        ).Stripe;
        if (stripeGlobal) stripe = stripeGlobal(stripeKey);
      }
      const res = await fetch(
        `/api/checkout?cartId=${encodeURIComponent(cartId)}`,
      );
      const data = (await res.json()) as CartApiResponse;
      if (res.ok) {
        cart = data.cart || null;
        shipping = data.shipping_options || [];
        providers = (data.payment_providers || []).filter(
          (p): p is PaymentProviderLike => {
            if (!p?.id || /system|manual|offline/i.test(p.id)) return false;
            if (/stripe|card/i.test(p.id) && !stripeKey) return false;
            if (/paypal/i.test(p.id) && !cfg.paypalClientId) return false;
            if (
              /apple|google|gpay|wallet/i.test(p.id) &&
              !stripeKey &&
              !cfg.paypalClientId
            )
              return false;
            return true;
          },
        );
      }
    } catch {
      /* local cart */
    }
  }

  if (!cart?.items?.length && localItems.length) {
    cart = {
      items: localItems,
      currency: cookieCurrency(),
      subtotal: localItems.reduce(
        (s: number, i: SummaryLine) =>
          s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 1),
        0,
      ),
    };
  }
  if (!cart?.items?.length) {
    window.location.href = "/cart";
    return;
  }
  renderSummary();
  renderShipping();
  renderPay();
  if (
    new URLSearchParams(location.search).get("paypal") === "return" &&
    cartId
  ) {
    try {
      await completeOrder();
    } catch (e) {
      showError(errMessage(e, MSG.failed));
    }
  }
}

boot().catch((e) => showError(errMessage(e, MSG.unavailable)));
