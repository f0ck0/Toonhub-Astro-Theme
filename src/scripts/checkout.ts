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

interface StripeElementsLike {
  create(type: string, options?: unknown): StripeElementLike;
}

interface StripeLike {
  elements(options?: { clientSecret?: string }): StripeElementsLike;
  confirmCardPayment(
    clientSecret: string,
    options?: unknown,
  ): Promise<{ error?: { message?: string } }>;
  confirmPayment(options: unknown): Promise<{
    error?: { message?: string };
    paymentIntent?: { status?: string };
  }>;
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
let stripeKey = "";
/** Stripe Payment Element 上下文:选择卡支付时创建支付会话并挂载官方表单 */
let stripeCtx: { elements: StripeElementsLike; providerId: string } | null = null;
/** 防重入:避免双击支付按钮并发创建多个支付会话(PayPal 订单/Stripe intent) */
let paying = false;
/** 促销状态:后台停用后前端自动隐藏活动文案,不自动应用折扣;code/折扣率动态读取 */
import { promoInfo } from "./lib/promo";
let autoPromoApplied = false;
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
    // 先按 rel 找支付页链接(approve/payer-action/redirect);
    // 之前的 `|| l?.href` 会让 find 命中第一个带 href 的链接(rel=self 的 API 地址),
    // 导致浏览器跳到 api.paypal.com/v2/checkout/orders/{id},无鉴权头 → AUTHENTICATION_FAILURE
    const a = record.links.find(
      (l) => /approve|payer-action|redirect/i.test(l?.rel || ""),
    );
    if (a?.href) return a.href;
    const any = record.links.find((l) => l?.href);
    if (any?.href) return any.href;
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

/** 支付方式品牌色:仅保留 PayPal 与 Stripe 的颜色,其余不染色;PayPal 用亮蓝保证暗主题可读 */
function brandColor(id: string): string {
  const s = id.toLowerCase();
  if (s.includes("paypal")) return "#4DB8FF"; // 亮蓝,暗背景清晰
  if (s.includes("stripe")) return "#635BFF"; // Stripe indigo
  return "";
}

/** 右侧品牌徽章(Shopify 风格:选项行右侧显示支持标识) */
function payBadgeHtml(id: string): string {
  const s = id.toLowerCase();
  if (s.includes("paypal")) {
    return `<span class="co-badge"><span class="pp">PayPal</span></span>`;
  }
  if (s.includes("stripe")) {
    return `<span class="co-badge"><span class="visa">VISA</span><span class="mc">MC</span><span class="amex">AMEX</span></span>`;
  }
  return "";
}

function renderPay() {
  const spinner = document.getElementById("payLoading");
  if (spinner) spinner.hidden = true;
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
      ${brandColor(p.id) ? `<span style="color:${brandColor(p.id)};font-weight:600;">${esc(p.label)}</span>` : `<span>${esc(p.label)}</span>`}
      ${payBadgeHtml(p.id)}
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
  if (isCard && stripe && !stripeCtx) {
    void mountStripePayment();
  }
}

/** 选择卡支付时:为【当前所选】提供商创建支付会话并挂载 Stripe 官方 Payment Element */
async function mountStripePayment(providerId?: string) {
  if (!stripe || stripeCtx) return;
  const id = providerId || selectedPay;
  if (!id || !/stripe|card/i.test(id)) return;
  try {
    const data = await api("pay", { providerId: id });
    const sessionData = (data.session?.data || {}) as Record<string, unknown>;
    const secret = (sessionData.client_secret ?? sessionData.clientSecret) as string | undefined;
    if (!secret) return;
    const elements = stripe.elements({ clientSecret: secret });
    const el = elements.create("payment", {
      layout: { type: "accordion" },
    });
    el.mount("#card-element");
    el.on("change", (e) => {
      const box = document.getElementById("card-errors");
      if (box) box.textContent = e.error?.message || "";
    });
    stripeCtx = { elements, providerId: id };
  } catch {
    /* 提交时再尝试 */
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
  if (paying) return;
  paying = true;
  showError("");
  const btn = document.getElementById("payBtn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = MSG.processing;
  const p = formPayload();
  try {
    await saveAddress();
    const local = snapshotLocal(p.email);
    if (providerId && cartId) {
      // Stripe:用官方 Payment Element 确认(选择时已创建会话并挂载表单)
      if (/stripe|card/i.test(providerId)) {
        if (!stripeCtx) await mountStripePayment();
        if (!stripeCtx || !stripe) throw new Error(MSG.paymentIncomplete);
        const result = await stripe.confirmPayment({
          elements: stripeCtx.elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout?stripe=return`,
          },
          redirect: "if_required",
        });
        if (result.error) throw new Error(result.error.message);
        await completeOrder();
        return;
      }
      const data = await api("pay", { providerId });
      const redirect = findPayUrl(data.session?.data);
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
    paying = false;
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
    /*
     * Buy-Now 直达:先把所选商品建成真实 Medusa 购物车,支付方式(及后续
     * 支付完成)才能正常加载;建车失败才退回本地渲染(纯静态兜底)。
     */
    let cartReady = false;
    if (buyNow.variantId) {
      try {
        // 必须带 JSON Content-Type,否则被 Astro CSRF 防护当作表单提交拦截
        const created = (await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }).then((r) => r.json())) as { cartId?: string };
        if (created.cartId) {
          const added = await fetch("/api/cart/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cartId: created.cartId,
              variantId: buyNow.variantId,
              quantity: buyNow.quantity,
            }),
          });
          if (added.ok) {
            localStorage.setItem("cartId", created.cartId);
            history.replaceState(null, "", "/checkout");
            cartReady = true;
          }
        }
      } catch {
        /* 建车失败 → 走本地兜底 */
      }
    }
    if (!cartReady) {
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
        // 自动应用活动折扣(购物车页未应用时兜底),code 与折扣率动态读取;停用则不应用
        const promoInfoNow = await promoInfo();
        const promoActiveNow = promoInfoNow.active;
        const units = (cart?.items || []).reduce(
          (s: number, i: { quantity?: number }) => s + (Number(i.quantity) || 1),
          0,
        );
        if (promoActiveNow && promoInfoNow.code && units >= 2 && !autoPromoApplied) {
          autoPromoApplied = true;
          await api("discount", { code: promoInfoNow.code }).catch(() => {});
          // 折扣应用后重新拉取购物车,刷新合计
          try {
            const res2 = await fetch(
              `/api/checkout?cartId=${encodeURIComponent(cartId)}`,
            );
            const data2 = (await res2.json()) as CartApiResponse;
            if (data2.cart) cart = data2.cart;
          } catch {
            /* 保持现有合计 */
          }
        }
        // 促销停用:隐藏活动横幅;启用:动态文案(折扣率随后台配置)
        const banner = document.querySelector<HTMLElement>("[data-offer-banner]");
        if (banner) {
          banner.hidden = !promoActiveNow;
          if (promoActiveNow && promoInfoNow.value != null) {
            banner.innerHTML = `<strong>Buy 1 get 2nd ${promoInfoNow.value}% off</strong><br />auto-applied at checkout`;
          }
        }
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
  const fromPay =
    new URLSearchParams(location.search).get("paypal") === "return" ||
    new URLSearchParams(location.search).get("stripe") === "return";
  if (fromPay && cartId) {
    try {
      await completeOrder();
    } catch (e) {
      showError(errMessage(e, MSG.failed));
    }
  }
}

boot().catch((e) => showError(errMessage(e, MSG.unavailable)));
