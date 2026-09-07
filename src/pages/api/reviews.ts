import type { APIRoute } from "astro";
import {
  medusaFetch,
  json,
  errorMessage,
  medusaErrorMessage,
} from "../../lib/server-medusa";
import {
  extractReviewList,
  fetchReviews,
  normalizeReview,
  type ReviewListData,
} from "../../lib/reviews";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const productId = url.searchParams.get("productId") || undefined;
  const {
    reviews,
    count: apiCount,
    averageHint,
  } = await fetchReviews(productId);
  const count = apiCount != null ? apiCount : reviews.length;
  const rated = reviews.filter((r) => r.rating > 0);
  const average = rated.length
    ? Math.round(
        (rated.reduce((s, r) => s + r.rating, 0) / rated.length) * 10,
      ) / 10
    : averageHint;
  return json({ reviews, count, average });
};

interface ReviewPayload {
  path: string;
  body: Record<string, unknown>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const ct = request.headers.get("content-type") || "";
    let productId = "";
    let rating = 5;
    let content = "";
    let name = "Anonymous";
    let title = "";
    let images: string[] = [];

    if (ct.includes("multipart/form-data")) {
      const fd = await request.formData();
      productId = String(fd.get("productId") || "");
      rating = Number(fd.get("rating") || 5);
      content = String(fd.get("content") || "");
      name = String(fd.get("name") || "Anonymous");
      title = String(fd.get("title") || "");
      images = fd
        .getAll("images")
        .filter((v): v is string => typeof v === "string");
    } else {
      const body = (await request.json()) as {
        productId?: string;
        product_id?: string;
        rating?: number;
        content?: string;
        comment?: string;
        name?: string;
        first_name?: string;
        title?: string;
        images?: string[];
      };
      productId = body.productId || body.product_id || "";
      rating = Number(body.rating || 5);
      content = body.content || body.comment || "";
      name = body.name || body.first_name || "Anonymous";
      title = body.title || "";
      images = body.images || [];
    }

    if (!productId || !content)
      return json({ error: "productId and content are required" }, 400);

    const first = name.split(" ")[0];
    const last = name.split(" ").slice(1).join(" ");
    const payloads: ReviewPayload[] = [
      {
        path: "/store/product-reviews",
        body: {
          reviews: [
            { product_id: productId, rating, content, name, title, images },
          ],
        },
      },
      {
        path: "/store/reviews",
        body: {
          product_id: productId,
          rating,
          content,
          title,
          first_name: first,
          last_name: last,
          images,
        },
      },
      {
        path: `/store/products/${productId}/reviews`,
        body: {
          rating,
          content,
          title,
          first_name: first,
          last_name: last,
          images,
          name,
        },
      },
    ];

    let lastErr = "Submission failed";
    for (const p of payloads) {
      const { ok, status, data } = await medusaFetch<ReviewListData>(p.path, {
        method: "POST",
        body: JSON.stringify(p.body),
      });
      if (ok)
        return json({
          success: true,
          reviews: extractReviewList(data).map(normalizeReview),
          data,
        });
      lastErr = medusaErrorMessage(data, `Submission failed (${status})`);
      if (status === 401 || status === 403)
        lastErr =
          data?.message ||
          "Please sign in or complete an order before reviewing.";
    }
    return json({ error: lastErr }, 400);
  } catch (e) {
    return json({ error: errorMessage(e) }, 500);
  }
};
