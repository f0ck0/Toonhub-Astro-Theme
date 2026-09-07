/**
 * Shared configuration primitives.
 *
 * Kept in its own module because both `astro.config.mjs` and `src/lib/site.ts`
 * need it, and `src/` is TypeScript-strict while the Astro config is plain JS.
 *
 * The canonical origin of the site is `SITE_URL`, overridable via env;
 * targeted awin1.com URLs are shortened through `GT_PHP_DOMAIN` when set.
 */

export const SITE_URL = process.env.SITE_URL || "https://toonhubshop.com"

/** When set, URLs pointing at `awin1.com` are shortened via `:domain/gt.php`. */
export const GT_PHP_DOMAIN = process.env.GT_PHP_DOMAIN || ""
