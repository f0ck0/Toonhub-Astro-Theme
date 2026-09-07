/**
 * Review-lib contract tests: the endpoint fall-through chain (the sandbox
 * cannot reach Medusa, so these guards pin the probed plugin shapes) and
 * row normalisation for every known Medusa-review-plugin payload variant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const medusaFetch = vi.fn(async (path: string) => {
  calls.push(path);
  return { ok: false, status: 404, data: null } as {
    ok: boolean;
    status: number;
    data: unknown;
  };
});

vi.mock("../src/lib/server-medusa", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../src/lib/server-medusa")>();
  return { ...original, medusaFetch };
});

const { fetchReviews, normalizeReview, extractReviewList } =
  await import("../src/lib/reviews");

beforeEach(() => {
  calls.length = 0;
  medusaFetch.mockReset();
  medusaFetch.mockImplementation(async (path: string) => {
    calls.push(path);
    return { ok: false, status: 404, data: null };
  });
});

describe("fetchReviews — endpoint fall-through", () => {
  it("probes the global feeds in order and takes the first ok response", async () => {
    medusaFetch.mockImplementation(async (path: string) => {
      calls.push(path);
      if (path.startsWith("/store/reviews?limit=")) {
        return {
          ok: true,
          status: 200,
          data: { reviews: [{ id: "r2", rating: 5, content: "great" }] },
        };
      }
      return { ok: false, status: 404, data: null };
    });
    const result = await fetchReviews(undefined, 24);
    expect(calls).toEqual([
      "/store/product-reviews?limit=24",
      "/store/reviews?limit=24",
    ]);
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].id).toBe("r2");
  });

  it("falls through per-product shapes — official /store/products/:id/reviews convention", async () => {
    medusaFetch.mockImplementation(async (path: string) => {
      calls.push(path);
      if (path.startsWith("/store/products/prod_9/reviews")) {
        return {
          ok: true,
          status: 200,
          data: { product_reviews: [{ id: "r1", rating: 4 }] },
        };
      }
      return { ok: false, status: 404, data: null };
    });
    const result = await fetchReviews("prod_9");
    expect(calls).toEqual([
      "/store/product-reviews?product_id=prod_9&limit=50",
      "/store/products/prod_9/reviews?limit=50",
    ]);
    expect(result.reviews).toHaveLength(1);
  });

  it("returns an empty result when the whole probe chain fails", async () => {
    const result = await fetchReviews("missing");
    expect(result).toEqual({ reviews: [], count: null, averageHint: 0 });
  });

  it("keeps probing after transport exceptions, not just non-ok statuses", async () => {
    medusaFetch.mockImplementation(async (path: string) => {
      calls.push(path);
      if (path.startsWith("/store/reviews?product_id=")) {
        return {
          ok: true,
          status: 200,
          data: { reviews: [{ id: "r3", rating: 3 }] },
        };
      }
      throw new Error("network down");
    });
    const result = await fetchReviews("prod_x");
    expect(calls).toHaveLength(3);
    expect(result.reviews[0].id).toBe("r3");
  });

  it("carries backend-reported count and average hints", async () => {
    medusaFetch.mockImplementation(async (path: string) => {
      calls.push(path);
      return {
        ok: true,
        status: 200,
        data: { reviews: [{ id: "r", rating: 5 }], count: 412, average: 4.86 },
      };
    });
    const result = await fetchReviews(undefined, 10);
    expect(result.count).toBe(412);
    expect(result.averageHint).toBeCloseTo(4.86);
  });
});

describe("normalizeReview — every plugin row shape", () => {
  it("handles the classic medusa v1 custom-endpoint rows", () => {
    const review = normalizeReview({
      id: "r1",
      user_name: "Kenji",
      rating: 5,
      title: "Double boxed!",
      content: "Zero QC issues.",
      created_at: "2026-08-01T00:00:00Z",
    } as never);
    expect(review).toMatchObject({
      id: "r1",
      rating: 5,
      content: "Zero QC issues.",
    });
    expect(review.images).toEqual([]);
  });

  it("prefers content, then comment, then body", () => {
    expect(
      normalizeReview({
        id: "a",
        content: "C",
        comment: "K",
        body: "B",
      } as never).content,
    ).toBe("C");
    expect(
      normalizeReview({ id: "a", comment: "K", body: "B" } as never).content,
    ).toBe("K");
    expect(normalizeReview({ id: "a", body: "B" } as never).content).toBe("B");
  });

  it("collects photos from images/photos/review_images + lone image, string or {url}", () => {
    const review = normalizeReview({
      id: "r2",
      rating: 5,
      photos: ["https://cdn/1.webp"],
      review_images: [
        { url: "https://cdn/2.webp" },
        { original_url: "https://cdn/3.webp" },
      ],
      image: "https://cdn/4.webp",
    } as never);
    expect(review.images).toEqual([
      "https://cdn/1.webp",
      "https://cdn/2.webp",
      "https://cdn/3.webp",
      "https://cdn/4.webp",
    ]);
  });

  it("threads the Medusa product_id through for card enrichment", () => {
    const review = normalizeReview({
      id: "r3",
      rating: 4,
      product_id: "prod_77",
    } as never);
    expect(review.productId).toBe("prod_77");
  });

  it("falls back to customer first_name / Anonymous names", () => {
    expect(
      normalizeReview({
        id: "n1",
        rating: 5,
        customer: { first_name: "Miko" },
      } as never).name,
    ).toBe("Miko");
    expect(normalizeReview({ id: "n2", rating: 5 } as never).name).toBe(
      "Anonymous",
    );
  });

  it("never trusts the raw rating — malformed values become 0", () => {
    expect(
      normalizeReview({ id: "z", rating: "not-a-number" } as never).rating,
    ).toBe(0);
  });
});

describe("extractReviewList — envelope variants", () => {
  it("reads product_reviews, reviews, data and bare arrays", () => {
    const row = { id: "x", rating: 5 };
    expect(extractReviewList({ product_reviews: [row] } as never)).toHaveLength(
      1,
    );
    expect(extractReviewList({ reviews: [row] } as never)).toHaveLength(1);
    expect(extractReviewList({ data: [row] } as never)).toHaveLength(1);
    expect(extractReviewList([row] as never)).toHaveLength(1);
    expect(extractReviewList(null)).toEqual([]);
    expect(extractReviewList({} as never)).toEqual([]);
  });
});

/**
 * Marquee orchestration (homepage). Injected deps keep this deterministic —
 * the real backend is unreachable from CI/sandboxes.
 */
const { collectReviewCards } = await import("../src/lib/reviews");

/*
 * The real `Product` requires `title`/`handle`; these fixtures only care about
 * the id, so build them through a factory that fills the rest in rather than
 * a looser local shape (which would not be assignable to `CollectReviewCardsDeps`).
 */
import type { Product } from "../src/types";

const product = (id: string, extra: Partial<Product> = {}): Product => ({
  id,
  title: `T-${id}`,
  handle: `h-${id}`,
  ...extra,
});

const review = (
  id: string,
  rating = 5,
  images: string[] = [],
  productId?: string,
) => ({
  id,
  name: "N",
  rating,
  title: "",
  content: `c-${id}`,
  created_at: "",
  response: "",
  images,
  productId,
});

describe("collectReviewCards — global feed path", () => {
  const arrivals: Product[] = [product("a1")];
  const base = {
    fetchGlobal: async () => ({
      reviews: [review("g1", 5, ["img"], "p1")],
      count: 1,
      averageHint: 5,
    }),
    fetchForProduct: async () => ({ reviews: [], count: 0, averageHint: 0 }),
    fetchProducts: async (ids: string[]) =>
      ids.map((id) => ({ id, title: `enriched:${id}` }) as Product),
    arrivals,
  };

  it("enriches global picks with catalogue products", async () => {
    const cards = await collectReviewCards(base);
    expect(cards).toHaveLength(1);
    expect(cards[0].product?.title).toBe("enriched:p1");
    expect(cards[0].review.id).toBe("g1");
  });

  it("prefers photo reviews when there are enough, caps at maxCards", async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      review(`ph${i}`, 5, ["img"], "p"),
    ).concat(
      Array.from({ length: 10 }, (_, i) => review(`tx${i}`, 5, [], "p")),
    );
    const cards = await collectReviewCards({
      ...base,
      maxCards: 8,
      fetchGlobal: async () => ({ reviews: many, count: 20, averageHint: 4 }),
    });
    expect(cards).toHaveLength(8);
    expect(cards.every((card) => card.review.images.length)).toBe(true);
  });

  it("accepts text-only reviews when photos are scarce", async () => {
    const cards = await collectReviewCards({
      ...base,
      fetchGlobal: async () => ({
        reviews: [review("t1"), review("t2", 4, ["img"], "p1")],
        count: 2,
        averageHint: 0,
      }),
    });
    expect(cards).toHaveLength(2);
  });
});

describe("collectReviewCards — per-product fan-out fallback", () => {
  const arrivals: Product[] = Array.from({ length: 4 }, (_, i) =>
    product(`prod-${i}`, { handle: `h-${i}` }),
  );

  it("fires when the global feed is empty and backfills productId", async () => {
    const called: string[] = [];
    const cards = await collectReviewCards({
      fetchGlobal: async () => ({ reviews: [], count: 0, averageHint: 0 }),
      fetchForProduct: async (id: string) => {
        called.push(id);
        return {
          reviews: [review(`${id}-r`, 4.5, ["img"])],
          count: 1,
          averageHint: 0,
        };
      },
      fetchProducts: async () => {
        throw new Error("must not run in fallback");
      },
      arrivals,
    });
    expect(cards).toHaveLength(4);
    expect(cards[0].review.productId).toBe(cards[0].product?.id);
    expect(cards[0].product?.handle).toBe("h-0");
    expect(called).toHaveLength(4);
  });

  it("survives transport errors on the global path AND individual products", async () => {
    const cards = await collectReviewCards({
      fetchGlobal: async () => {
        throw new Error("medusa down");
      },
      fetchForProduct: async (id: string) => {
        if (id === "prod-1") throw new Error("boom");
        return { reviews: [], count: 0, averageHint: 0 };
      },
      fetchProducts: async () => [],
      arrivals,
    });
    expect(cards).toEqual([]);
  });

  it("takes at most 2 reviews per product and respects maxCards overall", async () => {
    const manyPerProduct = Array.from({ length: 5 }, (_, i) => review(`r${i}`));
    const cards = await collectReviewCards({
      fetchGlobal: async () => ({ reviews: [], count: null, averageHint: 0 }),
      fetchForProduct: async () => ({
        reviews: manyPerProduct,
        count: 5,
        averageHint: 0,
      }),
      fetchProducts: async () => [],
      arrivals,
      maxCards: 3,
    });
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => card.product?.id)).size).toBeGreaterThan(
      1,
    );
  });
});

/**
 * `summarizeReviews` — the store-wide headline shown by the rating strip. It
 * is shared by `/api/reviews` and the homepage so the SSR strip and the
 * client-hydrated one can never quote different numbers.
 */
const { summarizeReviews } = await import("../src/lib/reviews");

describe("summarizeReviews", () => {
  it("averages the rated rows and rounds to one decimal", () => {
    expect(
      summarizeReviews({
        reviews: [review("a", 5), review("b", 4), review("c", 5)],
        count: null,
        averageHint: 0,
      }),
    ).toEqual({ count: 3, average: 4.7 });
  });

  it("prefers the backend's own total over the page of rows it returned", () => {
    // A 100-row page out of 988 must not report "100 reviews".
    const { count } = summarizeReviews({
      reviews: [review("a", 5)],
      count: 988,
      averageHint: 0,
    });
    expect(count).toBe(988);
  });

  it("falls back to the row count when the backend reports none", () => {
    expect(
      summarizeReviews({
        reviews: [review("a", 5), review("b", 5)],
        count: null,
        averageHint: 0,
      }).count,
    ).toBe(2);
  });

  it("uses the backend average only when no row carries a rating", () => {
    expect(
      summarizeReviews({
        reviews: [review("a", 0), review("b", 0)],
        count: 2,
        averageHint: 4.9,
      }),
    ).toEqual({ count: 2, average: 4.9 });
  });

  it("returns zeroes for an empty feed so the strip stays hidden", () => {
    expect(
      summarizeReviews({ reviews: [], count: null, averageHint: 0 }),
    ).toEqual({ count: 0, average: 0 });
  });

  it("clamps a nonsense average into the 0–5 the star fill expects", () => {
    expect(
      summarizeReviews({ reviews: [], count: 5, averageHint: 9 }).average,
    ).toBe(5);
    expect(
      summarizeReviews({ reviews: [], count: 5, averageHint: -3 }).average,
    ).toBe(0);
  });
});
