/// <reference path="../.astro/types.d.ts" />

import type { Locale } from "./i18n/ui"

declare global {
  namespace App {
    interface Locals {
      /**
       * UI locale negotiated for this request by `src/middleware.ts`
       * (cookie → `Accept-Language` → `defaultLocale`). Read it through
       * `pageLocale(Astro)` rather than touching `locals` directly.
       */
      locale?: Locale
    }
  }
}

export {}
