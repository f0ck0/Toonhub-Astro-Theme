/**
 * Review fetching/normalisation shared by `/api/reviews` and server-rendered
 * pages (the homepage review marquees). Kept in `lib/` because both the API
 * route and page frontmatter need the same transport + normalisation logic:
 * the live API probe list and every plugin-version row shape.
 */

import { medusaFetch } from "./server-medusa";
import type { MedusaReviewRow, NormalizedReview } from "../types";

/** Review photos arrive as strings or objects depending on the Medusa version. */
interface ReviewImageLike {
  url?: string;
  original_url?: string;
  src?: string;
}

function imageUrl(x: unknown): string {
  if (typeof x === "string") return x;
  if (x && typeof x === "object") {
    const obj = x as ReviewImageLike;
    return String(obj.url || obj.original_url || obj.src || "");
  }
  return "";
}

function reviewImages(r: MedusaReviewRow): string[] {
  const lists: unknown[][] = [r?.images, r?.photos, r?.review_images].filter(
    Array.isArray,
  );
  const raw: unknown[] = lists.flat();
  if (r?.image) raw.push(r.image);
  return raw.map(imageUrl).filter(Boolean);
}

export function normalizeReview(r: MedusaReviewRow): NormalizedReview {
  const name =
    r.name ||
    r.first_name ||
    [r.first_name, r.last_name].filter(Boolean).join(" ") ||
    (r.customer?.first_name ?? "") ||
    "Anonymous";
  return {
    id: r.id,
    productId: r.product_id,
    name,
    rating: Number(r.rating) || 0,
    title: r.title || "",
    content: r.content || r.comment || r.body || "",
    created_at: r.created_at,
    response:
      r.response ||
      r.reply ||
      r.admin_reply ||
      r.product_review_response?.content ||
      "",
    images: reviewImages(r),
  };
}

/** Review-list envelope — every plugin version uses a different key name. */
export interface ReviewListData {
  product_reviews?: MedusaReviewRow[];
  reviews?: MedusaReviewRow[];
  data?: MedusaReviewRow[];
  count?: number;
  average?: number;
  average_rating?: number;
}

export function extractReviewList(
  data: ReviewListData | MedusaReviewRow[] | null | undefined,
): MedusaReviewRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.product_reviews || data.reviews || data.data || [];
}

export interface StoreReviewsResult {
  reviews: NormalizedReview[];
  /** Reported by the backend when it knows the true total, else `null`. */
  count: number | null;
  /** Backend-reported average (some plugins include it on list responses). */
  averageHint: number;
}

/** Store-wide rating headline: `{ count, average }`, both 0 when unknown. */
export interface ReviewSummaryStats {
  count: number;
  average: number;
}

/**
 * Collapse a review list into the numbers the rating strip shows.
 *
 * The average is computed from the rated rows we actually hold, and only falls
 * back to the backend's own hint when none of them carry a rating (some plugin
 * versions return the average but omit per-row values). Shared by `/api/reviews`
 * and the homepage so the SSR strip and the hydrated one cannot disagree.
 */
export function summarizeReviews(
  result: StoreReviewsResult,
): ReviewSummaryStats {
  const count =
    result.count != null && result.count > 0
      ? result.count
      : result.reviews.length;
  const rated = result.reviews.filter((review) => review.rating > 0);
  const average = rated.length
    ? Math.round(
        (rated.reduce((sum, review) => sum + review.rating, 0) / rated.length) *
          10,
      ) / 10
    : result.averageHint;
  return {
    count: Math.max(0, count),
    average: Math.min(5, Math.max(0, average || 0)),
  };
}

/**
 * Store-wide review list (`productId = undefined`) or one product's reviews.
 * Tries the known plugin shapes in order, first 200-response wins. Returns an
 * empty result when the backend has no review plugin or is unreachable.
 */
export async function fetchReviews(
  productId?: string,
  limit = 100,
): Promise<StoreReviewsResult> {
  const tries = productId
    ? [
        `/store/product-reviews?product_id=${encodeURIComponent(productId)}&limit=50`,
        `/store/products/${encodeURIComponent(productId)}/reviews?limit=50`,
        `/store/reviews?product_id=${encodeURIComponent(productId)}&limit=50`,
      ]
    : [
        `/store/product-reviews?limit=${limit}`,
        `/store/reviews?limit=${limit}`,
      ];

  for (const path of tries) {
    try {
      const { ok, data } = await medusaFetch<
        ReviewListData | MedusaReviewRow[]
      >(path);
      if (!ok) continue;
      const rows = extractReviewList(data);
      const envelope = !Array.isArray(data) ? data : null;
      return {
        reviews: rows.map(normalizeReview),
        count: envelope?.count != null ? Number(envelope.count) : null,
        averageHint: Number(envelope?.average ?? envelope?.average_rating) || 0,
      };
    } catch {
      /* next probe */
    }
  }
  return { reviews: [], count: null, averageHint: 0 };
}

/* -------------------------------------------------------------------------- *
 * Homepage marquee orchestration — kept pure & injectable so the selection
 * rules (photo-preference, caps, fan-out fallback) are unit-testable without
 * a live Medusa backend. Consumed by `pages/index.astro`.
 * -------------------------------------------------------------------------- */

import type { Product } from "../types";

export interface ReviewCardPick {
  review: NormalizedReview;
  product: Product | null;
}

export interface CollectReviewCardsDeps {
  /** Global (store-wide) review feed. */
  fetchGlobal: () => Promise<StoreReviewsResult>;
  /** One product's reviews. */
  fetchForProduct: (productId: string) => Promise<StoreReviewsResult>;
  /** Enrich a set of product ids with full catalogue records. */
  fetchProducts: (ids: string[]) => Promise<Product[]>;
  /** The new-arrivals rail used by the fan-out fallback. */
  arrivals: Product[];
  maxCards?: number;
}

const PHOTO_PREFERENCE_MIN = 6;

function sortPickable(reviews: NormalizedReview[]): NormalizedReview[] {
  const withPhotos = reviews.filter(
    (review) => review.rating > 0 && review.images.length > 0,
  );
  if (withPhotos.length >= PHOTO_PREFERENCE_MIN) return withPhotos;
  return reviews.filter((review) => review.rating > 0);
}

/**
 * Marquee card source: global feed first (catalogue-enriched); when the
 * plugin only exposes per-product routes, fan out over the new-arrivals rail
 * until there is enough real material. Every failure path yields an empty
 * list — the section simply hides itself.
 */
export async function collectReviewCards(
  deps: CollectReviewCardsDeps,
): Promise<ReviewCardPick[]> {
  const maxCards = deps.maxCards ?? 24;

  try {
    const { reviews } = await deps.fetchGlobal();
    const picks = sortPickable(reviews).slice(0, maxCards);
    if (picks.length) {
      const ids = [
        ...new Set(
          picks
            .map((review) => review.productId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const productById = new Map<string, Product>();
      if (ids.length) {
        for (const product of await deps.fetchProducts(ids)) {
          if (product?.id) productById.set(String(product.id), product);
        }
      }
      return picks.map((review) => ({
        review,
        product: review.productId
          ? (productById.get(review.productId) ?? null)
          : null,
      }));
    }
  } catch {
    /* fall through to the per-product fan-out */
  }

  const cards: ReviewCardPick[] = [];
  const arrivals = deps.arrivals.slice(0, 14);
  const bundles = await Promise.allSettled(
    arrivals.map((product) => deps.fetchForProduct(product.id)),
  );
  for (let i = 0; i < bundles.length && cards.length < maxCards; i += 1) {
    const result = bundles[i];
    const product = arrivals[i];
    if (result.status !== "fulfilled" || !product) continue;
    const pickable = result.value.reviews.filter((review) => review.rating > 0);
    if (!pickable.length) continue;
    const withPhotos = pickable.filter((review) => review.images.length > 0);
    for (const review of (withPhotos.length ? withPhotos : pickable).slice(
      0,
      2,
    )) {
      if (cards.length >= maxCards) break;
      cards.push({
        review: { ...review, productId: review.productId || product.id },
        product,
      });
    }
  }
  return cards;
}
