/**
 * UI copy dictionary.
 *
 * Components never hard-code user-facing strings that a translator would need
 * to touch: they call `useTranslations(pageLocale(Astro))` (or accept a
 * `lang` prop) and index into this table. Adding a locale = adding a column.
 *
 * Keys are grouped by surface so a translator can work top-to-bottom.
 */

export const defaultLocale = "en";
export const locales = ["en", "zh-Hant", "ja"] as const;

export type Locale = (typeof locales)[number];

/** Every key that must exist in each locale — `ui.en` is the source of truth. */
export type UiKey = keyof (typeof ui)["en"];

export const ui = {
  en: {
    /* a11y / chrome */
    "a11y.skipToContent": "Skip to content",
    "a11y.mainNavigation": "Main navigation",
    "a11y.footerNavigation": "Footer navigation",
    "a11y.breadcrumb": "Breadcrumb",
    "a11y.openMenu": "Open menu",
    "a11y.closeMenu": "Close menu",
    "a11y.openSearch": "Search",
    "a11y.closeSearch": "Close search",
    "a11y.openCart": "Cart",
    "a11y.account": "Account",
    "a11y.wishlist": "Wishlist",
    "a11y.currency": "Country / currency",
    "a11y.language": "Language",
    "a11y.previousSlide": "Previous",
    "a11y.nextSlide": "Next",
    "a11y.viewImage": "View image {n}",
    "a11y.increaseQty": "Increase quantity",
    "a11y.decreaseQty": "Decrease quantity",
    "a11y.loading": "Loading",

    /* nav */
    "nav.home": "Home",
    "nav.trackOrder": "Track Order",
    "nav.shopAll": "Shop All",
    "nav.animeList": "Anime List (A–Z)",
    "nav.account": "Account",
    "nav.wishlist": "Wishlist",
    "nav.search": "Search",

    /* product card */
    "card.chooseOptions": "Choose options",
    "card.addToCart": "Add to cart",
    "card.viewProduct": "View product",
    "card.sale": "Sale",
    "card.from": "From",
    "card.addToWishlist": "Add {title} to wishlist",
    "card.removeFromWishlist": "Remove {title} from wishlist",
    "card.imageUnavailable": "No image available",

    /* grid states */
    "grid.loadingProducts": "Loading figures…",
    "grid.loadMore": "Load more",
    "grid.loadingMore": "Loading next page…",
    "grid.retry": "Retry",
    "grid.emptyTitle": "No figures here yet",
    "grid.emptyBody":
      "This collection has no products right now. Browse the full catalogue instead.",
    "grid.browseAll": "Browse all collections",
    "grid.productCount": "{count} products",

    /* search */
    "search.placeholder": "Search anime figures…",
    "search.hint": "Type to search figures, series and more.",
    "search.submit": "Search",
    "search.resultsFor": "{count} results for “{query}”",
    "search.emptyTitle": "No results for “{query}”",
    "search.emptyBody":
      "Check the spelling, or try a series name like “One Piece”.",
    "search.filtersSeries": "Series",
    "search.filtersPrice": "Price",
    "search.filtersSort": "Sort",

    /* cart */
    "cart.title": "Your cart",
    "cart.titleAdded": "Added — checkout in 1 step",
    "cart.emptyTitle": "Your cart is empty",
    "cart.emptyBody": "Add a figure and it will show up here.",
    "cart.continueShopping": "Continue shopping",
    "cart.keepShopping": "Keep shopping",
    "cart.checkout": "Checkout now — free shipping",
    "cart.viewCart": "View cart",
    "cart.subtotal": "Subtotal",
    "cart.total": "Total",
    "cart.discount": "Buy 1 get 2nd item off (auto-applied)",
    "cart.remove": "Remove",
    "cart.freeShippingNote": "Free worldwide shipping · 30-day returns",

    /* quick view */
    "quickView.title": "Choose options",
    "quickView.selectOption": "Select option",
    "quickView.quantity": "Quantity",
    "quickView.buyNow": "Buy now — checkout",
    "quickView.addToCart": "Add to cart",
    "quickView.goingToCheckout": "Going to checkout…",

    /* empty / error states */
    "empty.notFoundTitle": "Page not found",
    "empty.notFoundBody":
      "The link may be broken, or the page may have been moved.",
    "empty.productNotFoundTitle": "Product not found",
    "empty.productNotFoundBody":
      "This figure is no longer available. Try the full catalogue.",
    "empty.wishlistTitle": "Your wishlist is empty",
    "empty.wishlistBody":
      "Tap the heart on any figure to save it on this device.",
    "empty.reviewsTitle": "No reviews yet",
    "empty.reviewsBody": "Be the first to tell collectors what you think.",

    /* footer / newsletter */
    "newsletter.heading": "Subscribe to our emails",
    "newsletter.body":
      "Subscribe for insider news, product launches and offers.",
    "newsletter.placeholder": "Email",
    "newsletter.submit": "Subscribe",
    "newsletter.success": "Thanks — you're on the list.",
    "newsletter.invalid": "Please enter a valid email.",
    "newsletter.error": "Could not subscribe. Try again.",
    "newsletter.networkError": "Network error. Please try again.",
    "footer.shop": "Shop",
    "footer.help": "Help",
    "footer.policies": "Policies",
    "footer.paymentMethods": "Payment methods",
    "footer.rights": "© {year}, {brand}",

    /* shared atoms */
    "a11y.close": "Close",
    "common.cancel": "Cancel",
    "common.retry": "Try again",
    "common.required": "required",
    "common.optional": "optional",
    "account.signIn": "Log in",
    "footer.terms": "Terms",
    "footer.privacy": "Privacy Policy",

    /* homepage */
    "site.tagline": "TOONHUB — Premium Anime Figures & Collectibles",
    "site.desc":
      "Shop premium anime figures, statues and collectibles. Free worldwide shipping. Buy 1 get the 2nd figure discounted.",

    "home.h1": "Anime figures and collectibles — shop by series",
    "home.seoBody1":
      "Discover 40+ anime-inspired figure collections at Toonhub, with hundreds of unique designs featuring vibrant, detailed sculpting and dynamic themes loved by anime fans — from action-packed heroes to mystical worlds and intense fantasy battles.",
    "home.seoBody2":
      "Our high-quality figures are built for collectors: premium materials, display-ready finishes, bold colour work and eye-catching detail that brings your favourite series to life. Every order ships free worldwide.",
    "home.shopByList": "Shop by List",
    "home.shopByListDesc":
      "{count} anime universes, sculpted and painted for display.",
    "home.clearance": "Seasonal Clearance Sale",
    "home.clearanceBody":
      "Buy 1 get the 2nd figure discounted, on top of free worldwide shipping.",
    "home.offerEnds": "Offer ends in",
    "home.newArrivals": "New Arrived Anime Figures",
    "home.newArrivalsDesc": "{count} figures across every series.",
    "home.railHint": "Drag or use the arrow keys to browse",
    "home.reviewsMarqueeTitle": "New-arrival anime figures — collector reviews",
    "home.reviewsMarqueeSub": "{count} real reviews from collectors worldwide",
    "home.reviewOnProduct": "Review by {name} on {product}",
    "home.viewAll": "View all",
    "home.moreTitle": "400+ More Figures in Collections Below",
    "home.moreDesc": "Every series we stock, grouped alphabetically.",
    "home.seoTitle": "Anime Figures at Toonhub",
    "home.catalogueStatus": "Catalogue status",
    "home.demoNotice":
      "The Medusa backend is unreachable, so this page is showing the bundled demo catalogue.",

    /* product detail */
    "pdp.zoomImage": "Open this image full size",
    "pdp.lightboxTitle": "Product image",
    "pdp.imageAlt": "{title} — product photo",
    "pdp.galleryThumbs": "Product thumbnails",
    "pdp.thumbLabel": "Show image {index} of {total}",
    "pdp.seriesLabel": "Series",
    "pdp.writeReview": "Write a review",
    "pdp.reviewsTitle": "Customer reviews ({count})",
    "pdp.reviewsLabel": "Customer reviews",
    "pdp.descriptionTab": "Description",
    "pdp.shippingTab": "Shipping & returns",
    "pdp.detailsTitle": "About this figure",
    "pdp.selectedOption": "Selected: {title}",
    "pdp.ratingSummary": "{rating} out of 5 stars",
    "pdp.firstReview": "Be the first to review this figure.",
    "pdp.yourRating": "Your rating",
    "pdp.starOne": "{n} star",
    "pdp.starMany": "{n} stars",
    "pdp.reviewTitleLabel": "Review title",
    "pdp.reviewBodyLabel": "Your review",
    "pdp.reviewNameLabel": "Name",
    "pdp.reviewImagesLabel": "Photos (optional)",
    "pdp.submitReview": "Submit review",
    "pdp.related": "You may also like",
    "pdp.azTitle": "A–Z Anime List",
    "pdp.azDesc": "Jump straight to a series.",
    "pdp.demoNotice":
      "Showing bundled demo data — the Medusa backend is unreachable.",
    "pdp.noImageBody": "No artwork has been uploaded for this product yet.",

    /* cart page */
    "cart.items": "Cart items",
    "cart.summary": "Summary",
    "cart.shipping": "Shipping",
    "cart.freeShipping": "Free worldwide",
    "cart.taxesNote":
      "Taxes included. Discounts and shipping calculated at checkout.",
    "cart.discountLabel": "Buy 1 get 2nd item off (auto-applied)",
    "cart.legalPrefix": "By checking out you agree to the",
    "cart.legalAnd": "and",
    "cart.agreePrefix": "I agree to the ",
    "cart.agreeAnd": " and the ",
    "cart.agreeSuffix": ".",
    "cart.agreeHint":
      "Please tick the box to agree to the Terms and Privacy Policy before checking out.",
    "cart.jsTitle": "JavaScript is required",
    "cart.jsBody":
      "Your cart is stored on this device and rendered in the browser, so this page needs JavaScript enabled.",

    /* search page */
    "search.title": "Search",
    "search.noResults": "No results for “{query}”",
    "search.noResultsHint":
      "Check the spelling, try a shorter term, or browse every collection.",
    "search.resultOne": "{count} result for “{query}”",
    "search.resultMany": "{count} results for “{query}”",

    /* wishlist page */
    "wishlist.intro":
      "Saved figures on this device. Sign in later to keep them across browsers.",
    "wishlist.jsBody":
      "Saved figures live in this browser's storage, so the wishlist needs JavaScript enabled.",

    /* 404 */
    "notFound.popular": "Popular collections",
    /* contact page */
    "contact.title": "Contact us",
    "contact.intro":
      "Questions about an order, a figure or a pre-order? Email {email} or use the form below — we reply within one business day.",
    "contact.formHeading": "Contact form",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.phone": "Phone number",
    "contact.message": "Message",
    "contact.submit": "Send message",
    "contact.sending": "Sending…",
    "contact.success": "Thanks — we'll get back to you shortly.",
    "contact.error": "Could not send your message. Please try again.",
    "contact.networkError": "Network error. Please try again.",
    "contact.requiredNote": "Fields marked {mark} are required.",

    /* order tracking */
    "track.title": "Track your order",
    "track.intro":
      "Enter the order number from your confirmation email plus the email you ordered with. Once your parcel ships you can also follow it at the carrier.",
    "track.orderNumber": "Order number",
    "track.emailLabel": "Email",
    "track.parcelNote": "Or paste a carrier tracking number below.",
    "track.parcel": "Tracking number (optional)",
    "track.submit": "Track order",
    "track.looking": "Looking up your order…",
    "track.needBoth": "Enter an order number and email, or a tracking number.",
    "track.openingCarrier": "Opening carrier tracking for {number}.",
    "track.notFound":
      "We could not find that order. Use the exact order number from your confirmation email, or paste a tracking number.",
    "track.noMatchParcel":
      "We could not match that order. Opening carrier tracking for {number}…",
    "track.orderHeading": "Order {id}",
    "track.statusLabel": "Status",
    "track.placed": "Placed {date}",
    "track.trackingLink": "Tracking",
    "track.openCarrier": "Open carrier",
    "track.noTracking":
      "No carrier tracking number yet — it appears here when your order ships.",
    "track.parcelLabel": "Parcel",
    "track.updatesTo": "Updates will be emailed to {email}.",
    "track.resultHeading": "Tracking result",

    /* blog */
    "blog.title": "Blog",
    "blog.intro": "News, guides and insights from the Toonhub team.",
    "blog.back": "Back to blog",
    "blog.empty": "No posts yet",
    "blog.emptyHint":
      "Release news and collecting guides will appear here soon.",
    "blog.readMore": "Read {title}",
    "blog.postNotFound": "Post not found",
    "blog.postNotFoundHint": "This article may have been renamed or removed.",
    "notFound.shopAll": "Shop all collections",
    "notFound.goHome": "Back to home",

    /* cards / grids */
    "card.priceUnavailable": "Price unavailable",
    "grid.sortLabel": "Sort by",
    "grid.allLabel": "All",
    "grid.moreLikeThis": "More like this",
    "grid.subCollections": "{title} sub-collections",
    "grid.relatedCollections": "Related collections",

    /* collection sort + headings */
    "sort.featured": "Featured",
    "sort.az": "Alphabetically, A–Z",
    "sort.za": "Alphabetically, Z–A",
    "sort.priceAsc": "Price, low to high",
    "sort.priceDesc": "Price, high to low",
    "collection.newDesigns": "New Designs",
    "collection.headingPrefix": "Collection: {title}",
    "collection.defaultTitle": "Collection",
    /* trust icons */
    "trust.freeShipping": "Free shipping",
    "trust.returns": "30-day returns",
    "trust.ssl": "SSL encrypted",
    "trust.gift": "2nd figure discounted",

    /* policy layout + shared policy link text */
    "policy.lastUpdated": "Last updated",
    "policy.link.refund": "Refund Policy",
    "policy.link.privacy": "Privacy Policy",
    "policy.link.terms": "Terms of Service",

    /* about page */
    "about.title": "About Us",
    "about.metaDesc":
      "The story of TOONHUB — premium anime figures for collectors worldwide.",
    "about.storyH": "Our Story",
    "about.storyP1":
      "Founded by a group of anime enthusiasts, TOONHUB was born from a shared love for the art, stories, and culture of anime. We saw a need for a dedicated space where fans could find the best anime figures and connect with others who share their passion.",
    "about.storyP2":
      "Since our inception, we've been committed to delivering an exceptional experience to our customers and fostering a vibrant, inclusive community of collectors.",
    "about.sellH": "What we sell",
    "about.sellP":
      "Premium anime figures, statues and collectibles — from One Piece, Dragon Ball, Demon Slayer, Jujutsu Kaisen and dozens more universes. Every piece is selected for sculpt quality, paint finish and display presence.",
    "about.promiseH": "Our promise",
    "about.promise1": "Worldwide free shipping on every order",
    "about.promise2": "Buy 1 get the 2nd figure discounted",
    "about.promise3": "30-day guarantee on unused items",
    "about.promise4": "Secure, encrypted checkout",

    /* care guide */
    "care.title": "Figure Care Guide",
    "care.metaDesc":
      "How to keep your Toonhub anime figures looking their best.",
    "care.intro":
      "A little care goes a long way. Follow these guidelines so your collection stays display-ready for years.",
    "care.placementH": "Placement",
    "care.placementP":
      "Keep figures out of direct sunlight and away from heat sources. UV and high temperatures can fade paint and warp PVC over time. A closed display case is ideal if you have pets or dust-heavy rooms.",
    "care.dustingH": "Dusting",
    "care.dustingP":
      "Dust weekly with a clean, dry makeup brush or air blower. Avoid paper towels and household cloths — they can scratch delicate paint apps. For stubborn dust, lightly dampen a cotton swab with distilled water and dab, never rub.",
    "care.handlingH": "Handling",
    "care.handlingP":
      "Hold figures by the sturdiest parts (torso, base). Support large accessories separately. Wash and dry your hands first so oils don't transfer to the sculpt.",
    "care.storageH": "Storage",
    "care.storageP":
      "If you box a figure, wrap it in acid-free tissue. Don't leave figures in hot cars or attics. Original boxes are great for long-term storage and for the 30-day return window.",
    "care.avoidH": "What not to do",
    "care.avoid1": "No alcohol, acetone or household cleaners",
    "care.avoid2": "No super-glue repairs without collector experience",
    "care.avoid3": "Don't force joints or pegs",

    /* affiliate */
    "affiliate.title": "Affiliate Program",
    "affiliate.metaDesc": "Earn commission sharing TOONHUB anime figures.",
    "affiliate.intro":
      "Love Toonhub? Share the collection and earn commission on every referred order.",
    "affiliate.howH": "How it works",
    "affiliate.how1": "Apply with your social or site details",
    "affiliate.how2": "Get a unique tracking link",
    "affiliate.how3":
      "Earn a percentage of net sales from customers you send our way",
    "affiliate.how4": "Payouts monthly once you hit the minimum threshold",
    "affiliate.applyH": "Apply",
    "affiliate.applyP":
      "Email {email} with the subject “Affiliate application” and include your platform, audience size, and content niche. We'll reply within a few business days.",

    /* cancellation policy */
    "policy.cancel.title": "Cancellation policy",
    "policy.cancel.metaDesc": "How to cancel a Toonhub order.",
    "policy.cancel.lead":
      "You may request cancellation within 24 hours of placing an order, provided the order has not yet entered production or been handed to the carrier.",
    "policy.cancel.howH": "How to cancel",
    "policy.cancel.howP":
      "Email {email} with your order number and the subject “Cancel order”. We'll confirm by email.",
    "policy.cancel.afterH": "After shipping",
    "policy.cancel.afterP1":
      "Once an order has shipped it cannot be cancelled. You may refuse the delivery or follow our",
    "policy.cancel.afterP2": "after it arrives.",
    "policy.cancel.customH": "Custom items",
    "policy.cancel.customP":
      "Made-to-order or personalized figures cannot be cancelled once production has started.",

    /* privacy policy */
    "policy.privacy.title": "Privacy policy",
    "policy.privacy.metaDesc":
      "How TOONHUB collects and uses your information.",
    "policy.privacy.lead":
      "TOONHUB (“we”) respects your privacy. This policy describes how we collect, use and share information when you visit {domain} or place an order.",
    "policy.privacy.collectH": "What we collect",
    "policy.privacy.collect1":
      "Contact details (name, email, shipping address, phone)",
    "policy.privacy.collect2": "Order history and cart contents",
    "policy.privacy.collect3": "Device and usage data (browser, pages viewed)",
    "policy.privacy.collect4":
      "Currency and language preferences stored in cookies",
    "policy.privacy.useH": "How we use it",
    "policy.privacy.useP":
      "To process orders, provide customer support, send shipping updates, improve the store, and — if you opt in — email you about launches and offers. We do not sell your personal information.",
    "policy.privacy.cookiesH": "Cookies",
    "policy.privacy.cookiesP":
      "We use essential cookies for cart, currency and language. Analytics cookies, if enabled, help us understand traffic. You can control cookies in your browser.",
    "policy.privacy.sharingH": "Sharing",
    "policy.privacy.sharingP":
      "We share data with payment processors, shipping carriers and hosting providers only as needed to fulfill your order. We may disclose information if required by law.",
    "policy.privacy.rightsH": "Your rights",
    "policy.privacy.rightsP":
      "You may request access, correction or deletion of your personal data by emailing {email}. EU/UK visitors also have rights under GDPR; California residents may have additional rights under the CCPA.",
    "policy.privacy.contactH": "Contact",

    /* refund policy */
    "policy.refund.title": "Refund policy",
    "policy.refund.metaDesc": "30-day returns on unused Toonhub figures.",
    "policy.refund.lead":
      "We have a 30-day return policy, which means you have 30 days after receiving your item to request a return.",
    "policy.refund.clearanceStrong": "All clearance items are final sale",
    "policy.refund.clearanceRest":
      "unless the item arrives damaged or defective.",
    "policy.refund.eligible":
      "To be eligible for a return, your item must be in the same condition that you received it, unused, with tags, and in its original packaging. You'll also need proof of purchase. Custom items are non-returnable.",
    "policy.refund.startH": "How to start a return",
    "policy.refund.startP":
      "Contact {email}. If your request is approved, we'll send a return address and instructions. Customers arrange and pay for return shipping. Items sent back without prior approval will not be accepted.",
    "policy.refund.detailsH": "Order details",
    "policy.refund.detailsP":
      "Please check your order details before placing an order. Contact us within 24 hours if you entered incorrect details. After an order ships, address changes may not be possible.",
    "policy.refund.damageH": "Damages",
    "policy.refund.damageP":
      "Inspect your order on arrival. Report damaged, defective or incorrect items within 48 hours with photos and your order number so we can make it right.",
    "policy.refund.refundsH": "Refunds",
    "policy.refund.refundsP":
      "Once we receive and inspect your return, we'll notify you. If approved, you'll be refunded on your original payment method within 10 business days (banks may take longer to post).",
    "policy.refund.euH": "EU 14-day cooling off",
    "policy.refund.euP":
      "If merchandise is shipped into the European Union, you may cancel or return within 14 days for any reason, provided the item is unused and in original packaging — except where this conflicts with the sections above (custom / clearance / damaged-by-use).",

    /* shipping policy */
    "policy.shipping.title": "Shipping policy",
    "policy.shipping.metaDesc":
      "Free worldwide shipping on Toonhub anime figures.",
    "policy.shipping.procH": "Order processing",
    "policy.shipping.procP1":
      "Please make sure your order details are correct. Customers are liable for wrong information submitted. Check your order before placing it, or contact us within 24 hours if something is wrong.",
    "policy.shipping.procP2":
      "All orders are processed within 2–3 business days. Orders are not shipped or delivered on weekends or holidays.",
    "policy.shipping.confH": "Confirmation",
    "policy.shipping.confP":
      "You will receive an email confirmation when your order is placed, and a second email with tracking once it ships. After shipment, address changes may incur a courier reshipment fee.",
    "policy.shipping.intlH": "International shipping",
    "policy.shipping.intlP":
      "We offer free international shipping to selected countries. Typical delivery windows:",
    "policy.shipping.intl1":
      "USA, UK, Canada, Australia, Europe — 7–10 business days",
    "policy.shipping.intl2":
      "Japan, Korea, China, Singapore — 5–7 business days",
    "policy.shipping.vatP":
      "VAT is not included. The buyer is responsible for any applicable VAT or import duties.",
    "policy.shipping.trackH": "Tracking",
    "policy.shipping.trackP1":
      "Use the tracking number in your shipping email, or our",
    "policy.shipping.trackP2": "page. Questions: {email}.",
    "policy.shipping.issuesH": "Delivery issues",
    "policy.shipping.issuesP":
      "If tracking shows delivered but you have not received the parcel, contact the carrier first. If a package arrives damaged, email {email} with your order number and photos.",

    /* terms of service */
    "policy.terms.title": "Terms of service",
    "policy.terms.metaDesc": "Terms of service for shopping at TOONHUB.",
    "policy.terms.lead":
      "This website is operated by TOONHUB. Throughout the site, “we”, “us” and “our” refer to TOONHUB. By visiting our site or purchasing something from us, you agree to these Terms of Service.",
    "policy.terms.storeH": "Online store terms",
    "policy.terms.storeP":
      "You represent that you are the age of majority in your place of residence. You may not use our products for any illegal purpose or transmit any worms or viruses. A breach of these Terms may result in termination of Services.",
    "policy.terms.generalH": "General conditions",
    "policy.terms.generalP":
      "We reserve the right to refuse Service to anyone for any reason at any time. You agree not to reproduce, duplicate, copy, sell or resell any portion of the Service without express written permission.",
    "policy.terms.accuracyH": "Accuracy of information",
    "policy.terms.accuracyP":
      "We are not responsible if information on this site is not accurate, complete or current. Material is provided for general information only.",
    "policy.terms.pricesH": "Modifications to prices",
    "policy.terms.pricesP":
      "Prices for our products are subject to change without notice. We may modify or discontinue the Service without notice.",
    "policy.terms.productsH": "Products",
    "policy.terms.productsP1":
      "Certain products may be available exclusively online and are subject to our",
    "policy.terms.productsP2":
      "We have made every effort to display colors and images accurately, but cannot guarantee your display is exact.",
    "policy.terms.toolsH": "Optional tools & third-party links",
    "policy.terms.toolsP":
      "We may provide access to third-party tools. We have no control over those tools and are not liable for their use. Links to third-party sites are provided for convenience only.",
    "policy.terms.commentsH": "User comments",
    "policy.terms.commentsP":
      "If you post comments or reviews, you grant us a non-exclusive license to use, reproduce and publish them. You agree that your comments will not violate any third-party rights or contain unlawful content.",
    "policy.terms.personalH": "Personal information",
    "policy.terms.personalP1":
      "Your submission of personal information is governed by our",
    "policy.terms.contactH": "Contact",
    "policy.terms.contactP":
      "Questions about the Terms of Service should be sent to {email}.",

    /* account page (static) */
    "account.pageTitle": "My account",
    "account.homeTitle": "Your account",
    "account.loginTitle": "Login",
    "account.registerTitle": "Create account",
    "account.loginSub": "Sign in to access your orders and member benefits.",
    "account.registerSub":
      "Create your Toonhub account to track orders and member benefits.",
    "account.firstName": "First name",
    "account.lastName": "Last name",
    "account.emailPh": "Email address",
    "account.password": "Password",
    "account.confirmPassword": "Confirm password",
    "account.legalPrefix": "By continuing, you agree to Toonhub's",
    "account.legalAnd": "and",
    "account.logout": "Log out",
    "account.details": "Account details",
    "account.name": "Name",
    "account.email": "Email",
    "account.phone": "Phone",
    "account.save": "Save",
    "account.editProfile": "Edit profile",
    "account.addresses": "Addresses",
    "account.orderHistory": "Order history",
    "account.parcelLabel": "Track a parcel",
    "account.parcelPh": "Tracking number",
    "account.trackBtn": "Track",
    "account.parcelNote1":
      "Looks up carrier tracking (17track). You can also use",
    "account.parcelNote2": "with your order number.",
    "account.metaDesc": "Sign in to view orders, addresses and tracking.",

    /* account page (script messages) */
    "account.msgPwdMismatch": "Passwords do not match",
    "account.msgLoading": "Loading…",
    "account.msgAuthFail": "Could not sign in. Check your email and password.",
    "account.msgSaveFail": "Could not save profile",
    "account.noAddress":
      "No saved address yet. Addresses appear after you place an order.",
    "account.addressFromCheckout": "From your last checkout.",
    "account.noOrdersPre": "You haven’t placed an order yet.",
    "account.browse": "Browse figures",
    "account.orderFallback": "Order",
    "account.trackAfterShip": "Tracking appears here after the parcel ships.",
    "account.trackThis": "Track this order",
    "account.carrierFallback": "Carrier",
    "account.welcomeBack": "Welcome back, {name}",

    /* checkout page (static) */
    "checkout.title": "Secure checkout",
    "checkout.metaDesc":
      "Secure checkout — free worldwide shipping, 30-day returns.",
    "checkout.crumbCart": "Cart",
    "checkout.crumbCurrent": "Checkout",
    "checkout.progressAria": "Checkout progress",
    "checkout.offerH": "Limited offer",
    "checkout.offerBody":
      "Buy 1 get 2nd item off — auto-applied at checkout · Free worldwide shipping · 30-day returns",
    "checkout.deliverTo": "Deliver to",
    "checkout.change": "Change",
    "checkout.contact": "Contact",
    "checkout.emailPh": "Email",
    "checkout.delivery": "Delivery",
    "checkout.countryAria": "Country / region",
    "checkout.countryOther": "Other / not listed",
    "checkout.countryNamePh": "Country name",
    "checkout.countryOtherHint":
      "We’ll use this to ship to you. If it isn’t a standard country code, we’ll email to confirm.",
    "checkout.fullName": "Full name",
    "checkout.address": "Address",
    "checkout.addApt": "+ Apartment, suite",
    "checkout.apartment": "Apartment, suite, etc.",
    "checkout.city": "City",
    "checkout.postal": "Postal code",
    "checkout.provincePh": "Province / state",
    "checkout.provinceOptionalPh": "Province / state (optional)",
    "checkout.addPhone": "+ Phone for delivery updates",
    "checkout.phonePh": "Phone",
    "checkout.shipIncluded": "Free worldwide shipping included",
    "checkout.newsletterAria": "Email me news and offers",
    "checkout.payment": "Payment",
    "checkout.payReservedH": "Reserved for PayPal / Stripe / wallets",
    "checkout.payReservedBody":
      "Payment methods appear here after they are connected in Medusa. You can still place the order — we will email the next step.",
    "checkout.yourOrder": "Your order",
    "checkout.discountPh": "Discount code",
    "checkout.apply": "Apply",
    "checkout.free": "Free",
    "checkout.placeOrder": "Place order — free shipping",
    "checkout.backToCart": "‹ Cart",
    "checkout.secureNote": "Secure checkout",
    "checkout.legalPrefix": "By placing this order you agree to our",
    "checkout.terms": "Terms",
    "checkout.privacy": "Privacy Policy",
    "checkout.legalAnd": "and",

    /* checkout script messages */
    "checkout.msgEmptyCart": "Your cart is empty.",
    "checkout.msgProcessing": "Processing…",
    "checkout.msgPayNow": "Pay now",
    "checkout.msgPlaceOrder": "Place order",
    "checkout.msgErrCountry": "Please enter your country name.",
    "checkout.msgErrProvince": "Please select your province / state.",
    "checkout.msgFailed": "Checkout failed",
    "checkout.msgUnavailable": "Checkout unavailable",
    "checkout.msgPaymentIncomplete": "Payment was not completed",
    "checkout.msgRequestFailed": "Request failed",
    "checkout.qtyEach": "Qty {qty} · {price} each",
    "checkout.shipLineDefault":
      "Free worldwide shipping included · 2–3 day processing",
    "checkout.shippingNameFallback": "Shipping",
    "checkout.provinceSelectFirst": "Select province / state",
    "checkout.countryOtherFallback": "Other",

    /* checkout success */
    "success.metaDesc":
      "Order confirmed — thank you for shopping with TOONHUB.",
    "success.heading": "Thank you for your order",
    "success.confirmed": "Your order is confirmed.",
    "success.orderConfirmed": "Order {order} is confirmed.",
    "success.receipt": " A receipt will be sent to {email}.",
    "success.nextH": "What happens next",
    "success.nextBody":
      "We pack in 2–3 business days · Free worldwide shipping with tracking · 30-day returns",
    "success.trackThis": "Track this order",
  },

  "zh-Hant": {
    "a11y.skipToContent": "跳至主要內容",
    "a11y.mainNavigation": "主導覽",
    "a11y.footerNavigation": "頁尾導覽",
    "a11y.breadcrumb": "麵包屑導覽",
    "a11y.openMenu": "開啟選單",
    "a11y.closeMenu": "關閉選單",
    "a11y.openSearch": "搜尋",
    "a11y.closeSearch": "關閉搜尋",
    "a11y.openCart": "購物車",
    "a11y.account": "帳戶",
    "a11y.wishlist": "心愿單",
    "a11y.currency": "國家 / 貨幣",
    "a11y.language": "語言",
    "a11y.previousSlide": "上一個",
    "a11y.nextSlide": "下一個",
    "a11y.viewImage": "檢視第 {n} 張圖片",
    "a11y.increaseQty": "增加數量",
    "a11y.decreaseQty": "減少數量",
    "a11y.loading": "載入中",

    "nav.home": "首頁",
    "nav.trackOrder": "訂單查詢",
    "nav.shopAll": "全部商品",
    "nav.animeList": "作品列表 (A–Z)",
    "nav.account": "帳戶",
    "nav.wishlist": "心愿單",
    "nav.search": "搜尋",

    "card.chooseOptions": "選擇款式",
    "card.addToCart": "加入購物車",
    "card.viewProduct": "查看商品",
    "card.sale": "特價",
    "card.from": "起價",
    "card.addToWishlist": "將 {title} 加入心愿單",
    "card.removeFromWishlist": "將 {title} 從心愿單移除",
    "card.imageUnavailable": "暫無圖片",

    "grid.loadingProducts": "載入模型中…",
    "grid.loadMore": "載入更多",
    "grid.loadingMore": "載入下一頁…",
    "grid.retry": "重試",
    "grid.emptyTitle": "此分類暫無商品",
    "grid.emptyBody": "這個系列目前沒有商品，先逛逛全部目錄吧。",
    "grid.browseAll": "瀏覽全部分類",
    "grid.productCount": "{count} 件商品",

    "search.placeholder": "搜尋動漫模型…",
    "search.hint": "輸入關鍵字搜尋模型、作品等。",
    "search.submit": "搜尋",
    "search.resultsFor": "「{query}」的 {count} 個結果",
    "search.emptyTitle": "找不到「{query}」",
    "search.emptyBody": "請檢查拼字，或改用作品名稱，例如「One Piece」。",
    "search.filtersSeries": "作品",
    "search.filtersPrice": "價格",
    "search.filtersSort": "排序",

    "cart.title": "您的購物車",
    "cart.titleAdded": "已加入 — 一鍵結帳",
    "cart.emptyTitle": "購物車是空的",
    "cart.emptyBody": "加入模型後會顯示在這裡。",
    "cart.continueShopping": "繼續購物",
    "cart.keepShopping": "繼續購物",
    "cart.checkout": "立即結帳 — 免運費",
    "cart.viewCart": "檢視購物車",
    "cart.subtotal": "小計",
    "cart.total": "總計",
    "cart.discount": "第 2 件折扣(自動套用)",
    "cart.remove": "移除",
    "cart.freeShippingNote": "全球免運 · 30 天退貨",

    "quickView.title": "選擇款式",
    "quickView.selectOption": "選擇款式",
    "quickView.quantity": "數量",
    "quickView.buyNow": "立即購買 — 前往結帳",
    "quickView.addToCart": "加入購物車",
    "quickView.goingToCheckout": "前往結帳…",

    "empty.notFoundTitle": "找不到頁面",
    "empty.notFoundBody": "連結可能已失效，或頁面已被移動。",
    "empty.productNotFoundTitle": "找不到商品",
    "empty.productNotFoundBody": "這款模型已下架，試試全部目錄。",
    "empty.wishlistTitle": "心愿單是空的",
    "empty.wishlistBody": "點擊任何模型上的愛心即可在此裝置保存。",
    "empty.reviewsTitle": "尚未有評價",
    "empty.reviewsBody": "成為第一個分享心得的收藏家。",

    "newsletter.heading": "訂閱我們的電子報",
    "newsletter.body": "訂閱以獲得新品、活動與優惠資訊。",
    "newsletter.placeholder": "電子郵件",
    "newsletter.submit": "訂閱",
    "newsletter.success": "感謝訂閱！",
    "newsletter.invalid": "請輸入有效的電子郵件地址。",
    "newsletter.error": "訂閱失敗，請再試一次。",
    "newsletter.networkError": "網路錯誤，請再試一次。",
    "footer.shop": "購物",
    "footer.help": "幫助",
    "footer.policies": "政策",
    "footer.paymentMethods": "付款方式",
    "footer.rights": "© {year} {brand}",

    /* 通用元素 */
    "a11y.close": "關閉",
    "common.cancel": "取消",
    "common.retry": "再試一次",
    "common.required": "必填",
    "common.optional": "選填",
    "account.signIn": "登入",
    "footer.terms": "服務條款",
    "footer.privacy": "隱私權政策",

    /* 首頁 */
    "site.tagline": "TOONHUB — 珍藏級動漫模型與收藏品",
    "site.desc": "選購優質動漫模型、雕像與收藏品。全球免運，第二件折扣。",

    "home.h1": "動漫模型與收藏品 — 依系列選購",
    "home.seoBody1":
      "Toonhub 收錄 40 多個動漫系列、數百款獨特設計，色彩鮮豔、細節精緻，從熱血英雄到奇幻世界與激烈對戰，滿足每位動漫迷的收藏渴望。",
    "home.seoBody2":
      "我們的模型以收藏標準打造：優質素材、可直接展示的完成度、大膽的用色與吸睛細節，讓喜愛的系列栩栩如生。每筆訂單皆享全球免運。",
    "home.shopByList": "依系列選購",
    "home.shopByListDesc": "{count} 個動漫世界，精心雕琢與上色，適合收藏展示。",
    "home.clearance": "季節清倉特惠",
    "home.clearanceBody": "第二件折扣，再加全球免運。",
    "home.offerEnds": "優惠倒數",
    "home.newArrivals": "新到貨動漫模型",
    "home.newArrivalsDesc": "橫跨各系列共 {count} 款模型。",
    "home.railHint": "拖曳或使用方向鍵瀏覽",
    "home.reviewsMarqueeTitle": "新到貨動漫模型 · 收藏家評價",
    "home.reviewsMarqueeSub": "來自全球收藏家的 {count} 則真實評價",
    "home.reviewOnProduct": "{name} 對 {product} 的評價",
    "home.viewAll": "查看全部",
    "home.moreTitle": "下方系列還有 400+ 款模型",
    "home.moreDesc": "我們販售的每個系列，依字母順序排列。",
    "home.seoTitle": "Toonhub 的動漫模型",
    "home.catalogueStatus": "商品目錄狀態",
    "home.demoNotice":
      "目前無法連線至 Medusa 後端，此頁顯示內建的示範商品目錄。",

    /* 商品詳情 */
    "pdp.zoomImage": "以全尺寸開啟此圖片",
    "pdp.lightboxTitle": "商品圖片",
    "pdp.imageAlt": "{title} — 商品照片",
    "pdp.galleryThumbs": "商品縮圖",
    "pdp.thumbLabel": "顯示第 {index} 張，共 {total} 張",
    "pdp.seriesLabel": "系列",
    "pdp.writeReview": "撰寫評論",
    "pdp.reviewsTitle": "顧客評論（{count}）",
    "pdp.reviewsLabel": "顧客評論",
    "pdp.descriptionTab": "商品說明",
    "pdp.shippingTab": "配送與退貨",
    "pdp.detailsTitle": "關於這款模型",
    "pdp.selectedOption": "已選擇：{title}",
    "pdp.ratingSummary": "{rating} 顆星（滿分 5 顆）",
    "pdp.firstReview": "成為第一位評論這款模型的人。",
    "pdp.yourRating": "您的評分",
    "pdp.starOne": "{n} 顆星",
    "pdp.starMany": "{n} 顆星",
    "pdp.reviewTitleLabel": "評論標題",
    "pdp.reviewBodyLabel": "您的評論",
    "pdp.reviewNameLabel": "名稱",
    "pdp.reviewImagesLabel": "相片（選填）",
    "pdp.submitReview": "送出評論",
    "pdp.related": "您可能也喜歡",
    "pdp.azTitle": "A–Z 動漫列表",
    "pdp.azDesc": "直接跳轉至系列。",
    "pdp.demoNotice": "正在顯示內建示範資料 — 無法連線至 Medusa 後端。",
    "pdp.noImageBody": "此商品尚未上傳圖片。",

    /* 購物車頁 */
    "cart.items": "購物車商品",
    "cart.summary": "訂單摘要",
    "cart.shipping": "運費",
    "cart.freeShipping": "全球免運",
    "cart.taxesNote": "已含稅。折扣與運費將於結帳時計算。",
    "cart.discountLabel": "第 2 件折扣(自動套用)",
    "cart.legalPrefix": "結帳即表示您同意",
    "cart.legalAnd": "與",
    "cart.agreePrefix": "我已閱讀並同意",
    "cart.agreeAnd": "及",
    "cart.agreeSuffix": "。",
    "cart.agreeHint": "結帳前請先勾選同意服務條款與隱私權政策。",
    "cart.jsTitle": "需要 JavaScript",
    "cart.jsBody":
      "購物車儲存在此裝置並由瀏覽器渲染，因此本頁需要啟用 JavaScript。",

    /* 搜尋頁 */
    "search.title": "搜尋",
    "search.noResults": "找不到「{query}」的結果",
    "search.noResultsHint": "請確認拼字、改用較短的關鍵字，或瀏覽全部系列。",
    "search.resultOne": "「{query}」共有 {count} 筆結果",
    "search.resultMany": "「{query}」共有 {count} 筆結果",

    /* 願望清單頁 */
    "wishlist.intro": "儲存在此裝置的模型。日後登入即可在各瀏覽器同步保存。",
    "wishlist.jsBody":
      "儲存的模型存在此瀏覽器的儲存空間中，因此願望清單需要啟用 JavaScript。",

    /* 404 */
    "notFound.popular": "熱門系列",
    /* 聯絡頁 */
    "contact.title": "聯絡我們",
    "contact.intro":
      "對訂單、模型或預購有任何疑問？請寄信至 {email}，或填寫下方表單，我們將於一個工作日內回覆。",
    "contact.formHeading": "聯絡表單",
    "contact.name": "姓名",
    "contact.email": "電子郵件",
    "contact.phone": "電話號碼",
    "contact.message": "訊息內容",
    "contact.submit": "送出訊息",
    "contact.sending": "傳送中…",
    "contact.success": "感謝來訊，我們會盡快回覆。",
    "contact.error": "訊息送出失敗，請再試一次。",
    "contact.networkError": "網路錯誤，請再試一次。",
    "contact.requiredNote": "標示 {mark} 的欄位為必填。",

    /* 訂單追蹤 */
    "track.title": "追蹤您的訂單",
    "track.intro":
      "請輸入確認信中的訂單編號與下單時使用的電子郵件。包裹出貨後，您也可以至物流業者網站查詢。",
    "track.orderNumber": "訂單編號",
    "track.emailLabel": "電子郵件",
    "track.parcelNote": "或在下方貼上物流追蹤號碼。",
    "track.parcel": "追蹤號碼（選填）",
    "track.submit": "追蹤訂單",
    "track.looking": "正在查詢您的訂單…",
    "track.needBoth": "請輸入訂單編號與電子郵件，或填入追蹤號碼。",
    "track.openingCarrier": "正在開啟 {number} 的物流追蹤頁面。",
    "track.notFound":
      "找不到該訂單。請使用確認信中的完整訂單編號，或貼上追蹤號碼。",
    "track.noMatchParcel":
      "無法比對到該訂單。正在開啟 {number} 的物流追蹤頁面…",
    "track.orderHeading": "訂單 {id}",
    "track.statusLabel": "狀態",
    "track.placed": "下單時間 {date}",
    "track.trackingLink": "物流追蹤",
    "track.openCarrier": "開啟物流業者",
    "track.noTracking": "尚未產生物流追蹤號碼，出貨後會顯示於此。",
    "track.parcelLabel": "包裹",
    "track.updatesTo": "最新狀態將寄送至 {email}。",
    "track.resultHeading": "追蹤結果",

    /* 部落格 */
    "blog.title": "部落格",
    "blog.intro": "Toonhub 團隊的新聞、指南與收藏觀點。",
    "blog.back": "返回部落格",
    "blog.empty": "目前還沒有文章",
    "blog.emptyHint": "新品消息與收藏指南即將上線。",
    "blog.readMore": "閱讀〈{title}〉",
    "blog.postNotFound": "找不到文章",
    "blog.postNotFoundHint": "這篇文章可能已更名或移除。",
    "notFound.shopAll": "選購全部系列",
    "notFound.goHome": "返回首頁",

    /* 商品卡／列表 */
    "card.priceUnavailable": "暫無報價",
    "grid.sortLabel": "排序方式",
    "grid.allLabel": "全部",
    "grid.moreLikeThis": "相關推薦",
    "grid.subCollections": "{title} 子系列",
    "grid.relatedCollections": "相關系列",

    /* 系列排序與標題 */
    "sort.featured": "精選",
    "sort.az": "依名稱 A–Z",
    "sort.za": "依名稱 Z–A",
    "sort.priceAsc": "價格由低至高",
    "sort.priceDesc": "價格由高至低",
    "collection.newDesigns": "新品設計",
    "collection.headingPrefix": "系列：{title}",
    "collection.defaultTitle": "系列",
    /* 信任圖示 */
    "trust.freeShipping": "全球免運",
    "trust.returns": "30 天退貨",
    "trust.ssl": "SSL 加密",
    "trust.gift": "第 2 件折扣",

    /* 政策頁面與共用連結文字 */
    "policy.lastUpdated": "最後更新",
    "policy.link.refund": "退款政策",
    "policy.link.privacy": "隱私權政策",
    "policy.link.terms": "服務條款",

    /* 關於我們 */
    "about.title": "關於我們",
    "about.metaDesc": "TOONHUB 的故事 — 為全球收藏家打造的精緻動漫模型。",
    "about.storyH": "我們的故事",
    "about.storyP1":
      "TOONHUB 由一群動漫愛好者創立，源自對動漫藝術、故事與文化共同的熱愛。我們看見同好需要一個專屬空間，能找到最優質的動漫模型，並與志趣相投的人交流。",
    "about.storyP2":
      "自成立以來，我們致力於為顧客帶來出色的體驗，並凝聚一個充滿活力、包容的收藏家社群。",
    "about.sellH": "我們販售的商品",
    "about.sellP":
      "精緻動漫模型、雕像與收藏品 — 涵蓋 One Piece、龍珠、鬼滅之刃、咒術迴戰等數十個作品世界。每件商品都經過雕工、塗裝與展示質感的嚴選。",
    "about.promiseH": "我們的承諾",
    "about.promise1": "每筆訂單皆享全球免運",
    "about.promise2": "第 2 件折扣",
    "about.promise3": "未使用商品 30 天保證",
    "about.promise4": "安全加密結帳",

    /* 模型保養指南 */
    "care.title": "模型保養指南",
    "care.metaDesc": "讓您的 Toonhub 動漫模型歷久彌新的保養方法。",
    "care.intro":
      "多一分保養，收藏就能陪伴您更久。遵循以下指引，讓您的收藏多年如新。",
    "care.placementH": "擺放位置",
    "care.placementP":
      "請將模型置於陽光直射不到、遠離熱源的地方。紫外線與高溫會使塗裝褪色、PVC 變形。若家中有寵物或灰塵較多，建議使用密閉展示櫃。",
    "care.dustingH": "除塵",
    "care.dustingP":
      "每週以乾淨、乾燥的化妝刷或吹塵球除塵。避免使用紙巾與一般抹布 — 它們可能刮傷細緻的塗裝。頑固灰塵可用棉花棒沾少量蒸餾水輕點，切勿擦拭。",
    "care.handlingH": "拿取方式",
    "care.handlingP":
      "請握住模型最穩固的部位（軀幹、底座）。大型配件請另外托住。拿取前請先洗淨並擦乾雙手，避免油脂沾附本體。",
    "care.storageH": "收納保存",
    "care.storageP":
      "裝盒收藏時，請以無酸薄紙包覆。勿將模型留在高溫車內或閣樓。原廠外盒適合長期保存，也是 30 天退貨期內需要保留的憑證。",
    "care.avoidH": "請勿這麼做",
    "care.avoid1": "勿使用酒精、丙酮或家用清潔劑",
    "care.avoid2": "沒有經驗勿用瞬間膠自行修補",
    "care.avoid3": "勿強行扳動關節或卡榫",

    /* 聯盟計畫 */
    "affiliate.title": "聯盟計畫",
    "affiliate.metaDesc": "分享 TOONHUB 動漫模型，賺取推薦佣金。",
    "affiliate.intro":
      "喜歡 Toonhub 嗎？分享我們的收藏，每筆透過您推薦的訂單都能賺取佣金。",
    "affiliate.howH": "運作方式",
    "affiliate.how1": "提供您的社群帳號或網站資訊提出申請",
    "affiliate.how2": "獲得專屬追蹤連結",
    "affiliate.how3": "從您導入的顧客淨銷售額中賺取一定比例的佣金",
    "affiliate.how4": "達到最低門檻後按月撥款",
    "affiliate.applyH": "立即申請",
    "affiliate.applyP":
      "請來信 {email}，主旨註明「聯盟計畫申請」，並附上您的平台、受眾規模與內容領域。我們會在數個工作日內回覆。",

    /* 取消政策 */
    "policy.cancel.title": "取消政策",
    "policy.cancel.metaDesc": "如何取消 Toonhub 訂單。",
    "policy.cancel.lead":
      "您可以在下單後 24 小時內申請取消，前提是訂單尚未進入製作程序或交付物流。",
    "policy.cancel.howH": "如何取消",
    "policy.cancel.howP":
      "請來信 {email}，提供訂單編號並於主旨註明「取消訂單」。我們會以電子郵件確認。",
    "policy.cancel.afterH": "出貨之後",
    "policy.cancel.afterP1":
      "訂單一經出貨即無法取消。您可以拒收包裹，或於送達後依我們的",
    "policy.cancel.afterP2": "辦理退貨。",
    "policy.cancel.customH": "客製商品",
    "policy.cancel.customP": "接單製作或個人化模型在開始生產後即無法取消。",

    /* 隱私權政策 */
    "policy.privacy.title": "隱私權政策",
    "policy.privacy.metaDesc": "TOONHUB 如何收集與使用您的資訊。",
    "policy.privacy.lead":
      "TOONHUB（下稱「我們」）重視您的隱私。本政策說明您造訪 {domain} 或下單時，我們如何收集、使用與分享資訊。",
    "policy.privacy.collectH": "我們收集的資訊",
    "policy.privacy.collect1": "聯絡資訊（姓名、電子郵件、收件地址、電話）",
    "policy.privacy.collect2": "訂單記錄與購物車內容",
    "policy.privacy.collect3": "裝置與使用數據（瀏覽器、瀏覽頁面）",
    "policy.privacy.collect4": "儲存在 Cookie 中的貨幣與語言偏好",
    "policy.privacy.useH": "我們如何使用",
    "policy.privacy.useP":
      "用於處理訂單、提供客服、寄送出貨通知、改善商店體驗，並在您同意訂閱時寄送新品與優惠資訊。我們不會出售您的個人資訊。",
    "policy.privacy.cookiesH": "Cookie",
    "policy.privacy.cookiesP":
      "我們使用購物車、貨幣與語言所需的必要 Cookie。若啟用分析 Cookie，則用於了解流量。您可以在瀏覽器中管理 Cookie。",
    "policy.privacy.sharingH": "資訊分享",
    "policy.privacy.sharingP":
      "我們僅在完成訂單所需的範圍內，與支付服務商、物流業者及託管服務商分享資料。若法律要求，我們可能依法揭露資訊。",
    "policy.privacy.rightsH": "您的權利",
    "policy.privacy.rightsP":
      "您可以來信 {email} 要求查閱、更正或刪除您的個人資料。歐盟／英國訪客另享有 GDPR 賦予的權利；加州居民可能另享有 CCPA 賦予的權利。",
    "policy.privacy.contactH": "聯絡方式",

    /* 退款政策 */
    "policy.refund.title": "退款政策",
    "policy.refund.metaDesc": "未使用的 Toonhub 模型享有 30 天退貨服務。",
    "policy.refund.lead":
      "我們提供 30 天退貨政策，即收到商品後 30 天內可申請退貨。",
    "policy.refund.clearanceStrong": "所有清倉商品售出後恕不退換",
    "policy.refund.clearanceRest": "除非商品送達時已損壞或有瑕疵。",
    "policy.refund.eligible":
      "申請退貨的商品必須與您收到時狀態相同：未使用、吊牌齊全且為原包裝。您也需要提供購買證明。客製商品恕不接受退貨。",
    "policy.refund.startH": "如何申請退貨",
    "policy.refund.startP":
      "請聯絡 {email}。申請通過後，我們會提供退貨地址與說明。退貨運費由顧客自行安排並負擔。未經事先核准即寄回的商品恕不受理。",
    "policy.refund.detailsH": "訂單資訊",
    "policy.refund.detailsP":
      "下單前請確認訂單資訊正確無誤。若填寫有誤，請於 24 小時內與我們聯絡。訂單出貨後可能無法變更收件地址。",
    "policy.refund.damageH": "商品損壞",
    "policy.refund.damageP":
      "請於送達時檢查商品。如有損壞、瑕疵或寄錯商品，請於 48 小時內附上照片與訂單編號回報，我們會妥善處理。",
    "policy.refund.refundsH": "退款",
    "policy.refund.refundsP":
      "收到並檢查退回商品後，我們會通知您。核准後，款項將於 10 個工作日內退回原付款方式（銀行入帳可能需要更久）。",
    "policy.refund.euH": "歐盟 14 天鑑賞期",
    "policy.refund.euP":
      "運送至歐盟地區的商品，您可於 14 天內以任何理由取消或退貨，惟商品須未使用且為原包裝 — 若與上述條款（客製／清倉／使用損壞）衝突時除外。",

    /* 運送政策 */
    "policy.shipping.title": "運送政策",
    "policy.shipping.metaDesc": "Toonhub 動漫模型全球免運。",
    "policy.shipping.procH": "訂單處理",
    "policy.shipping.procP1":
      "請確認訂單資訊正確無誤。因資料填寫錯誤產生之問題由顧客自行負責。下單前請再次檢查，如有錯誤請於 24 小時內與我們聯絡。",
    "policy.shipping.procP2":
      "所有訂單將於 2–3 個工作日內處理。週末與國定假日不出貨、不配送。",
    "policy.shipping.confH": "訂單確認",
    "policy.shipping.confP":
      "下單成功後您會收到確認郵件，出貨後會再收到附追蹤號碼的第二封郵件。出貨後變更地址可能需支付物流改寄費用。",
    "policy.shipping.intlH": "國際運送",
    "policy.shipping.intlP": "我們提供指定國家免費國際運送。一般配送時效：",
    "policy.shipping.intl1": "美國、英國、加拿大、澳洲、歐洲 — 7–10 個工作日",
    "policy.shipping.intl2": "日本、韓國、中國、新加坡 — 5–7 個工作日",
    "policy.shipping.vatP":
      "價格未含增值稅。任何適用的增值稅或進口關稅由買方負擔。",
    "policy.shipping.trackH": "包裹追蹤",
    "policy.shipping.trackP1": "您可以使用出貨通知信中的追蹤號碼，或前往",
    "policy.shipping.trackP2": "頁面查詢。如有疑問請來信：{email}。",
    "policy.shipping.issuesH": "配送問題",
    "policy.shipping.issuesP":
      "若追蹤資訊顯示已投遞但您未收到包裹，請先聯絡物流業者。若包裹送達時已損壞，請附上訂單編號與照片寄信至 {email}。",

    /* 服務條款 */
    "policy.terms.title": "服務條款",
    "policy.terms.metaDesc": "於 TOONHUB 購物的服務條款。",
    "policy.terms.lead":
      "本網站由 TOONHUB 營運。全站所稱「我們」均指 TOONHUB。凡造訪本網站或向我們購買商品，即表示您同意本服務條款。",
    "policy.terms.storeH": "網路商店條款",
    "policy.terms.storeP":
      "您聲明已達居住地的法定成年年齡。您不得將我們的商品用於任何非法用途，或傳播任何蠕蟲或病毒。違反本條款可能導致服務被終止。",
    "policy.terms.generalH": "一般條件",
    "policy.terms.generalP":
      "我們保留隨時以任何理由拒絕向任何人提供服務的權利。未經明確書面許可，您不得複製、重製、拷貝、販售或轉售本服務的任何部分。",
    "policy.terms.accuracyH": "資訊準確性",
    "policy.terms.accuracyP":
      "本網站資訊如有不準確、不完整或未即時更新，我們概不負責。本站內容僅供一般參考。",
    "policy.terms.pricesH": "價格異動",
    "policy.terms.pricesP":
      "商品價格可能不經通知即調整。我們可能不經通知即修改或終止服務。",
    "policy.terms.productsH": "商品",
    "policy.terms.productsP1": "部分商品可能僅於網路販售，並適用我們的",
    "policy.terms.productsP2":
      "我們已盡力準確呈現商品顏色與圖片，但無法保證您的螢幕顯示完全一致。",
    "policy.terms.toolsH": "選用工具與第三方連結",
    "policy.terms.toolsP":
      "我們可能提供第三方工具的使用途徑，對該等工具不具控制力，亦不對其使用負責。第三方網站連結僅為便利而提供。",
    "policy.terms.commentsH": "使用者評論",
    "policy.terms.commentsP":
      "您發表評論或評價，即授予我們非專屬授權，得使用、重製及發布該內容。您同意您的評論不侵害任何第三方權利，亦不含違法內容。",
    "policy.terms.personalH": "個人資訊",
    "policy.terms.personalP1": "您提交個人資訊受我們的",
    "policy.terms.contactH": "聯絡方式",
    "policy.terms.contactP": "如對服務條款有任何疑問，請來信 {email}。",

    /* 帳戶頁（靜態） */
    "account.pageTitle": "我的帳戶",
    "account.homeTitle": "您的帳戶",
    "account.loginTitle": "登入",
    "account.registerTitle": "建立帳戶",
    "account.loginSub": "登入以查看訂單並享有會員福利。",
    "account.registerSub": "建立 Toonhub 帳戶，即可追蹤訂單並享有會員福利。",
    "account.firstName": "名字",
    "account.lastName": "姓氏",
    "account.emailPh": "電子郵件地址",
    "account.password": "密碼",
    "account.confirmPassword": "確認密碼",
    "account.legalPrefix": "繼續即表示您同意 Toonhub 的",
    "account.legalAnd": "與",
    "account.logout": "登出",
    "account.details": "帳戶資料",
    "account.name": "姓名",
    "account.email": "電子郵件",
    "account.phone": "電話",
    "account.save": "儲存",
    "account.editProfile": "編輯資料",
    "account.addresses": "收件地址",
    "account.orderHistory": "訂單記錄",
    "account.parcelLabel": "查詢包裹",
    "account.parcelPh": "追蹤號碼",
    "account.trackBtn": "查詢",
    "account.parcelNote1": "查詢物流追蹤資訊（17track）。您也可以使用",
    "account.parcelNote2": "並輸入訂單編號。",
    "account.metaDesc": "登入以查看訂單、地址與物流資訊。",

    /* 帳戶頁（腳本訊息） */
    "account.msgPwdMismatch": "兩次輸入的密碼不一致",
    "account.msgLoading": "載入中…",
    "account.msgAuthFail": "無法登入，請檢查電子郵件與密碼。",
    "account.msgSaveFail": "儲存資料失敗",
    "account.noAddress": "尚未儲存任何地址。下單後地址會顯示於此。",
    "account.addressFromCheckout": "來自您上次的結帳資訊。",
    "account.noOrdersPre": "您尚未下過訂單。",
    "account.browse": "瀏覽模型",
    "account.orderFallback": "訂單",
    "account.trackAfterShip": "包裹出貨後，追蹤資訊會顯示於此。",
    "account.trackThis": "追蹤此訂單",
    "account.carrierFallback": "物流",
    "account.welcomeBack": "歡迎回來，{name}",

    /* 結帳頁（靜態） */
    "checkout.title": "安全結帳",
    "checkout.metaDesc": "安全結帳 — 全球免運，30 天退貨。",
    "checkout.crumbCart": "購物車",
    "checkout.crumbCurrent": "結帳",
    "checkout.progressAria": "結帳進度",
    "checkout.offerH": "限時優惠",
    "checkout.offerBody": "第 2 件折扣 · 結帳自動套用 · 全球免運 · 30 天退貨",
    "checkout.deliverTo": "配送至",
    "checkout.change": "變更",
    "checkout.contact": "聯絡資訊",
    "checkout.emailPh": "電子郵件",
    "checkout.delivery": "配送資訊",
    "checkout.countryAria": "國家 / 地區",
    "checkout.countryOther": "其他 / 未列出",
    "checkout.countryNamePh": "國家名稱",
    "checkout.countryOtherHint":
      "我們將以此為配送依據。若非標準國家代碼，我們會以電子郵件與您確認。",
    "checkout.fullName": "收件人全名",
    "checkout.address": "地址",
    "checkout.addApt": "+ 公寓、套房",
    "checkout.apartment": "公寓、套房等",
    "checkout.city": "城市",
    "checkout.postal": "郵遞區號",
    "checkout.provincePh": "省 / 州",
    "checkout.provinceOptionalPh": "省 / 州（選填）",
    "checkout.addPhone": "+ 電話（接收配送通知）",
    "checkout.phonePh": "電話",
    "checkout.shipIncluded": "已含全球免運",
    "checkout.newsletterAria": "以電子郵件接收新品與優惠資訊",
    "checkout.payment": "付款方式",
    "checkout.payReservedH": "預留給 PayPal / Stripe / 電子錢包",
    "checkout.payReservedBody":
      "付款方式將於 Medusa 後台完成設定後顯示於此。您仍可先送出訂單 — 我們會以電子郵件告知後續步驟。",
    "checkout.yourOrder": "您的訂單",
    "checkout.discountPh": "折扣碼",
    "checkout.apply": "套用",
    "checkout.free": "免費",
    "checkout.placeOrder": "送出訂單 — 免運費",
    "checkout.backToCart": "‹ 購物車",
    "checkout.secureNote": "安全結帳",
    "checkout.legalPrefix": "送出訂單即表示您同意我們的",
    "checkout.terms": "服務條款",
    "checkout.privacy": "隱私權政策",
    "checkout.legalAnd": "與",

    /* 結帳腳本訊息 */
    "checkout.msgEmptyCart": "您的購物車是空的。",
    "checkout.msgProcessing": "處理中…",
    "checkout.msgPayNow": "立即付款",
    "checkout.msgPlaceOrder": "送出訂單",
    "checkout.msgErrCountry": "請輸入您的國家名稱。",
    "checkout.msgErrProvince": "請選擇您的省 / 州。",
    "checkout.msgFailed": "結帳失敗",
    "checkout.msgUnavailable": "結帳目前無法使用",
    "checkout.msgPaymentIncomplete": "付款尚未完成",
    "checkout.msgRequestFailed": "請求失敗",
    "checkout.qtyEach": "數量 {qty} · 單價 {price}",
    "checkout.shipLineDefault": "已含全球免運 · 2–3 個工作日處理",
    "checkout.shippingNameFallback": "運送",
    "checkout.provinceSelectFirst": "請選擇省 / 州",
    "checkout.countryOtherFallback": "其他",

    /* 結帳成功頁 */
    "success.metaDesc": "訂單已確認 — 感謝您在 TOONHUB 購物。",
    "success.heading": "感謝您的訂購",
    "success.confirmed": "您的訂單已確認。",
    "success.orderConfirmed": "訂單 {order} 已確認。",
    "success.receipt": "收據將寄送至 {email}。",
    "success.nextH": "後續流程",
    "success.nextBody": "2–3 個工作日內打包出貨 · 全球免運附追蹤 · 30 天退貨",
    "success.trackThis": "追蹤此訂單",
  },

  ja: {
    "a11y.skipToContent": "本文へスキップ",
    "a11y.mainNavigation": "メインナビゲーション",
    "a11y.footerNavigation": "フッターナビゲーション",
    "a11y.breadcrumb": "パンくずリスト",
    "a11y.openMenu": "メニューを開く",
    "a11y.closeMenu": "メニューを閉じる",
    "a11y.openSearch": "検索",
    "a11y.closeSearch": "検索を閉じる",
    "a11y.openCart": "カート",
    "a11y.account": "アカウント",
    "a11y.wishlist": "お気に入り",
    "a11y.currency": "国 / 通貨",
    "a11y.language": "言語",
    "a11y.previousSlide": "前へ",
    "a11y.nextSlide": "次へ",
    "a11y.viewImage": "画像 {n} を表示",
    "a11y.increaseQty": "数量を増やす",
    "a11y.decreaseQty": "数量を減らす",
    "a11y.loading": "読み込み中",

    "nav.home": "ホーム",
    "nav.trackOrder": "注文追跡",
    "nav.shopAll": "すべての商品",
    "nav.animeList": "作品一覧 (A–Z)",
    "nav.account": "アカウント",
    "nav.wishlist": "お気に入り",
    "nav.search": "検索",

    "card.chooseOptions": "オプションを選択",
    "card.addToCart": "カートに追加",
    "card.viewProduct": "商品を見る",
    "card.sale": "セール",
    "card.from": "から",
    "card.addToWishlist": "{title} をお気に入りに追加",
    "card.removeFromWishlist": "{title} をお気に入りから削除",
    "card.imageUnavailable": "画像がありません",

    "grid.loadingProducts": "フィギュアを読み込み中…",
    "grid.loadMore": "もっと見る",
    "grid.loadingMore": "次のページを読み込み中…",
    "grid.retry": "再試行",
    "grid.emptyTitle": "商品がありません",
    "grid.emptyBody": "このコレクションには現在商品がありません。",
    "grid.browseAll": "すべてのコレクションを見る",
    "grid.productCount": "{count} 件の商品",

    "search.placeholder": "アニメフィギュアを検索…",
    "search.hint": "作品名やフィギュア名を入力してください。",
    "search.submit": "検索",
    "search.resultsFor": "「{query}」の検索結果 {count} 件",
    "search.emptyTitle": "「{query}」の結果はありません",
    "search.emptyBody": "表記を確認するか、作品名でお試しください。",
    "search.filtersSeries": "作品",
    "search.filtersPrice": "価格",
    "search.filtersSort": "並び替え",

    "cart.title": "カート",
    "cart.titleAdded": "追加しました — 1ステップで決済",
    "cart.emptyTitle": "カートは空です",
    "cart.emptyBody": "フィギュアを追加するとここに表示されます。",
    "cart.continueShopping": "買い物を続ける",
    "cart.keepShopping": "買い物を続ける",
    "cart.checkout": "今すぐ決済 — 送料無料",
    "cart.viewCart": "カートを見る",
    "cart.subtotal": "小計",
    "cart.total": "合計",
    "cart.discount": "2点目割引(自動適用)",
    "cart.remove": "削除",
    "cart.freeShippingNote": "全世界送料無料 · 30日間返品可能",

    "quickView.title": "オプションを選択",
    "quickView.selectOption": "オプションを選択",
    "quickView.quantity": "数量",
    "quickView.buyNow": "今すぐ購入 — 決済へ",
    "quickView.addToCart": "カートに追加",
    "quickView.goingToCheckout": "決済へ移動中…",

    "empty.notFoundTitle": "ページが見つかりません",
    "empty.notFoundBody":
      "リンクが切れているか、ページが移動した可能性があります。",
    "empty.productNotFoundTitle": "商品が見つかりません",
    "empty.productNotFoundBody": "このフィギュアは現在取り扱いがありません。",
    "empty.wishlistTitle": "お気に入りは空です",
    "empty.wishlistBody": "ハートをタップするとこの端末に保存されます。",
    "empty.reviewsTitle": "レビューはまだありません",
    "empty.reviewsBody": "最初のレビューを投稿してみませんか。",

    "newsletter.heading": "メールマガジンに登録",
    "newsletter.body": "新商品やキャンペーン情報をお届けします。",
    "newsletter.placeholder": "メールアドレス",
    "newsletter.submit": "登録する",
    "newsletter.success": "登録が完了しました。",
    "newsletter.invalid": "有効なメールアドレスを入力してください。",
    "newsletter.error": "登録できませんでした。もう一度お試しください。",
    "newsletter.networkError": "ネットワークエラーが発生しました。",
    "footer.shop": "ショッピング",
    "footer.help": "ヘルプ",
    "footer.policies": "ポリシー",
    "footer.paymentMethods": "お支払い方法",
    "footer.rights": "© {year} {brand}",

    /* 共通 */
    "a11y.close": "閉じる",
    "common.cancel": "キャンセル",
    "common.retry": "もう一度試す",
    "common.required": "必須",
    "common.optional": "任意",
    "account.signIn": "ログイン",
    "footer.terms": "利用規約",
    "footer.privacy": "プライバシーポリシー",

    /* トップページ */
    "home.h1": "アニメフィギュア・コレクタブル — シリーズから探す",
    "site.tagline": "TOONHUB — プレミアムアニメフィギュア＆コレクタブル",
    "site.desc":
      "プレミアムなアニメフィギュア・スタチュー・コレクタブルをお届け。送料無料・2点目割引。",

    "home.seoBody1":
      "Toonhub では 40 以上のアニメシリーズ、数百点のオリジナルデザインをご用意。鮮やかで精巧な造形と躍動感あるテーマで、アクションヒーローから幻想世界、激しいバトルシーンまでファンの心を捉えます。",
    "home.seoBody2":
      "コレクター基準で仕上げた高品質フィギュア：上質な素材、そのまま飾れる完成度、大胆な彩色と目を引くディテールで、お気に入りのシリーズを生き生きと再現します。すべての注文は全世界送料無料です。",
    "home.shopByList": "シリーズから探す",
    "home.shopByListDesc":
      "{count} のアニメの世界を、造形と彩色にこだわってお届けします。",
    "home.clearance": "シーズンクリアランスセール",
    "home.clearanceBody": "2点目割引、さらに全世界送料無料。",
    "home.offerEnds": "セール終了まで",
    "home.newArrivals": "新着アニメフィギュア",
    "home.newArrivalsDesc": "全シリーズから {count} 点のフィギュア。",
    "home.railHint": "ドラッグまたは矢印キーで閲覧できます",
    "home.reviewsMarqueeTitle": "新着アニメフィギュア・コレクターレビュー",
    "home.reviewsMarqueeSub":
      "世界中のコレクターからの {count} 件の実際のレビュー",
    "home.reviewOnProduct": "{name} による {product} のレビュー",
    "home.viewAll": "すべて見る",
    "home.moreTitle": "下記のコレクションに 400 点以上",
    "home.moreDesc": "取り扱いシリーズをアルファベット順に。",
    "home.seoTitle": "Toonhub のアニメフィギュア",
    "home.catalogueStatus": "カタログの状態",
    "home.demoNotice":
      "Medusa バックエンドに接続できないため、同梱のデモカタログを表示しています。",

    /* 商品詳細 */
    "pdp.zoomImage": "この画像をフルサイズで開く",
    "pdp.lightboxTitle": "商品画像",
    "pdp.imageAlt": "{title} — 商品写真",
    "pdp.galleryThumbs": "商品のサムネイル",
    "pdp.thumbLabel": "{total} 枚中 {index} 枚目を表示",
    "pdp.seriesLabel": "シリーズ",
    "pdp.writeReview": "レビューを書く",
    "pdp.reviewsTitle": "カスタマーレビュー（{count}）",
    "pdp.reviewsLabel": "カスタマーレビュー",
    "pdp.descriptionTab": "商品説明",
    "pdp.shippingTab": "配送と返品",
    "pdp.detailsTitle": "このフィギュアについて",
    "pdp.selectedOption": "選択中：{title}",
    "pdp.ratingSummary": "5 点中 {rating} 点",
    "pdp.firstReview": "このフィギュアの最初のレビューを投稿しませんか。",
    "pdp.yourRating": "あなたの評価",
    "pdp.starOne": "{n} つ星",
    "pdp.starMany": "{n} つ星",
    "pdp.reviewTitleLabel": "レビューのタイトル",
    "pdp.reviewBodyLabel": "レビュー本文",
    "pdp.reviewNameLabel": "お名前",
    "pdp.reviewImagesLabel": "写真（任意）",
    "pdp.submitReview": "レビューを送信",
    "pdp.related": "こちらもおすすめ",
    "pdp.azTitle": "A–Z アニメリスト",
    "pdp.azDesc": "シリーズへ直接移動します。",
    "pdp.demoNotice":
      "同梱のデモデータを表示中 — Medusa バックエンドに接続できません。",
    "pdp.noImageBody": "この商品の画像はまだ登録されていません。",

    /* カートページ */
    "cart.items": "カートの商品",
    "cart.summary": "概要",
    "cart.shipping": "送料",
    "cart.freeShipping": "全世界無料",
    "cart.taxesNote": "税込価格です。割引と送料は購入手続きで計算されます。",
    "cart.discountLabel": "2点目割引(自動適用)",
    "cart.legalPrefix":
      "購入手続きを行うことで、以下に同意したものとみなされます：",
    "cart.legalAnd": "および",
    "cart.agreePrefix": "これらの",
    "cart.agreeAnd": "と",
    "cart.agreeSuffix": "に同意します。",
    "cart.agreeHint":
      "チェックアウト前に利用規約とプライバシーポリシーへの同意にチェックを入れてください。",
    "cart.jsTitle": "JavaScript が必要です",
    "cart.jsBody":
      "カートはこの端末に保存されブラウザで描画されるため、このページには JavaScript が必要です。",

    /* 検索ページ */
    "search.title": "検索",
    "search.noResults": "「{query}」に一致する結果はありません",
    "search.noResultsHint":
      "表記を確認するか、短いキーワードで探すか、全コレクションをご覧ください。",
    "search.resultOne": "「{query}」の検索結果 {count} 件",
    "search.resultMany": "「{query}」の検索結果 {count} 件",

    /* ウィッシュリスト */
    "wishlist.intro":
      "この端末に保存したフィギュア。ログインすれば複数のブラウザで保持できます。",
    "wishlist.jsBody":
      "保存したフィギュアはこのブラウザのストレージにあるため、ウィッシュリストには JavaScript が必要です。",

    /* 404 */
    "notFound.popular": "人気のコレクション",
    /* お問い合わせ */
    "contact.title": "お問い合わせ",
    "contact.intro":
      "ご注文・フィギュア・予約販売についてのご質問は {email} まで、または下記のフォームからどうぞ。1 営業日以内にご返信します。",
    "contact.formHeading": "お問い合わせフォーム",
    "contact.name": "お名前",
    "contact.email": "メールアドレス",
    "contact.phone": "電話番号",
    "contact.message": "お問い合わせ内容",
    "contact.submit": "送信する",
    "contact.sending": "送信中…",
    "contact.success": "ありがとうございます。近日中にご返信します。",
    "contact.error": "送信できませんでした。もう一度お試しください。",
    "contact.networkError": "ネットワークエラーが発生しました。",
    "contact.requiredNote": "{mark} の付いた項目は必須です。",

    /* 注文追跡 */
    "track.title": "ご注文の追跡",
    "track.intro":
      "確認メールに記載の注文番号と、ご注文時のメールアドレスを入力してください。発送後は配送業者のサイトでも追跡できます。",
    "track.orderNumber": "注文番号",
    "track.emailLabel": "メールアドレス",
    "track.parcelNote": "または下記の追跡番号を貼り付けてください。",
    "track.parcel": "追跡番号（任意）",
    "track.submit": "追跡する",
    "track.looking": "ご注文を確認しています…",
    "track.needBoth":
      "注文番号とメールアドレス、または追跡番号を入力してください。",
    "track.openingCarrier": "{number} の配送業者の追跡ページを開きます。",
    "track.notFound":
      "該当する注文が見つかりません。確認メールの注文番号を正確に入力するか、追跡番号を貼り付けてください。",
    "track.noMatchParcel":
      "注文を照合できませんでした。{number} の追跡ページを開きます…",
    "track.orderHeading": "注文 {id}",
    "track.statusLabel": "ステータス",
    "track.placed": "注文日 {date}",
    "track.trackingLink": "追跡番号",
    "track.openCarrier": "配送業者を開く",
    "track.noTracking":
      "追跡番号はまだありません。発送後にここに表示されます。",
    "track.parcelLabel": "荷物",
    "track.updatesTo": "最新情報は {email} にお送りします。",
    "track.resultHeading": "追跡結果",

    /* ブログ */
    "blog.title": "ブログ",
    "blog.intro": "Toonhub チームからのニュース、ガイド、コレクション情報。",
    "blog.back": "ブログへ戻る",
    "blog.empty": "まだ記事がありません",
    "blog.emptyHint": "新商品ニュースやコレクションガイドを近日公開します。",
    "blog.readMore": "「{title}」を読む",
    "blog.postNotFound": "記事が見つかりません",
    "blog.postNotFoundHint":
      "この記事は名前が変更されたか、削除された可能性があります。",
    "notFound.shopAll": "すべてのコレクションを見る",
    "notFound.goHome": "ホームへ戻る",

    /* カード／グリッド */
    "card.priceUnavailable": "価格未設定",
    "grid.sortLabel": "並び替え",
    "grid.allLabel": "すべて",
    "grid.moreLikeThis": "関連アイテム",
    "grid.subCollections": "{title} のサブコレクション",
    "grid.relatedCollections": "関連コレクション",

    /* コレクションの並び替え・見出し */
    "sort.featured": "おすすめ順",
    "sort.az": "名前 A–Z",
    "sort.za": "名前 Z–A",
    "sort.priceAsc": "価格の安い順",
    "sort.priceDesc": "価格の高い順",
    "collection.newDesigns": "新着デザイン",
    "collection.headingPrefix": "コレクション：{title}",
    "collection.defaultTitle": "コレクション",
    /* 信頼アイコン */
    "trust.freeShipping": "送料無料",
    "trust.returns": "30日間返品可能",
    "trust.ssl": "SSL 暗号化",
    "trust.gift": "2点目割引",

    /* ポリシーページ共通 */
    "policy.lastUpdated": "最終更新日",
    "policy.link.refund": "返金ポリシー",
    "policy.link.privacy": "プライバシーポリシー",
    "policy.link.terms": "利用規約",

    /* About */
    "about.title": "私たちについて",
    "about.metaDesc":
      "TOONHUB のストーリー — 世界中のコレクターへ上質なアニメフィギュアを。",
    "about.storyH": "私たちの物語",
    "about.storyP1":
      "TOONHUB はアニメを愛する仲間たちによって始まりました。アニメのアート、物語、文化への共通の愛から生まれたこのショップは、ファンが最高のアニメフィギュアと出会い、同じ情熱を持つ仲間とつながれる場所を目指しています。",
    "about.storyP2":
      "創業以来、お客様にとって特別な体験を届け、活気あるオープンなコレクターコミュニティを育てることに取り組んできました。",
    "about.sellH": "取り扱い商品",
    "about.sellP":
      "プレミアムなアニメフィギュア、スタチュー、コレクタブル。ワンピース、ドラゴンボール、鬼滅の刃、呪術廻戦など、数十の作品世界から厳選。造形の質、彩色の仕上がり、ディスプレイ映えを基準に選んでいます。",
    "about.promiseH": "私たちの約束",
    "about.promise1": "全注文・全世界送料無料",
    "about.promise2": "2点目割引",
    "about.promise3": "未使用品の30日間保証",
    "about.promise4": "安全な暗号化チェックアウト",

    /* ケアガイド */
    "care.title": "フィギュアお手入れガイド",
    "care.metaDesc": "Toonhub のフィギュアを長く美しく保つためのケア方法。",
    "care.intro":
      "少しのケアで、コレクションは何年も展示に耐える美しさを保てます。次のガイドラインをぜひお試しください。",
    "care.placementH": "設置場所",
    "care.placementP":
      "直射日光と熱源を避けてください。紫外線と高温は時間とともに塗装の色褪せや PVC の変形を招きます。ペットがいる家庭やホコリの多い部屋では、密閉できるディスプレイケースが理想的です。",
    "care.dustingH": "ホコリ取り",
    "care.dustingP":
      "週に一度、清潔で乾いたメイクブラシかブロアーでホコリを払ってください。ティッシュや家庭用布巾は細かい塗装面を傷つけることがあります。取れにくいホコリには、蒸留水を含ませた綿棒で軽く押さえるように拭き、こすらないでください。",
    "care.handlingH": "持ち方",
    "care.handlingP":
      "胴体や台座など、最も丈夫な部分を持ってください。大きな付属品は別に支えましょう。触る前に手を洗って乾かし、指の油が造形に移らないようにします。",
    "care.storageH": "保管方法",
    "care.storageP":
      "箱に戻す場合は中性紙（酸フリーティッシュ）で包んでください。高温になる車内や屋根裏には置かないでください。元箱は長期保管に最適で、30日間の返品期間にも必要です。",
    "care.avoidH": "やってはいけないこと",
    "care.avoid1": "アルコール、アセトン、家庭用洗剤は使わない",
    "care.avoid2": "経験がないのに瞬間接着剤で修理しない",
    "care.avoid3": "関節や突起を無理に動かさない",

    /* アフィリエイト */
    "affiliate.title": "アフィリエイトプログラム",
    "affiliate.metaDesc": "TOONHUB のフィギュアを紹介して報酬を得られます。",
    "affiliate.intro":
      "Toonhub がお気に入りですか？コレクションを紹介して、紹介経由の注文ごとに報酬を獲得しましょう。",
    "affiliate.howH": "仕組み",
    "affiliate.how1": "SNS やサイトの情報を添えて申請",
    "affiliate.how2": "専用のトラッキングリンクを取得",
    "affiliate.how3": "紹介したお客様の純売上に応じた報酬を獲得",
    "affiliate.how4": "最低支払額に達したら毎月お支払い",
    "affiliate.applyH": "申し込み",
    "affiliate.applyP":
      "件名を「アフィリエイト申請」として {email} 宛に、ご利用のプラットフォーム、フォロワー規模、コンテンツのジャンルをお書き添えの上ご連絡ください。数営業日以内にご返信します。",

    /* キャンセルポリシー */
    "policy.cancel.title": "キャンセルポリシー",
    "policy.cancel.metaDesc": "Toonhub のご注文のキャンセル方法。",
    "policy.cancel.lead":
      "ご注文が製作に入る前、または配送業者に引き渡される前であれば、ご注文後24時間以内にキャンセルをご依頼いただけます。",
    "policy.cancel.howH": "キャンセル方法",
    "policy.cancel.howP":
      "件名を「注文キャンセル」としてご注文番号を {email} までお送りください。メールにてご確認をお知らせします。",
    "policy.cancel.afterH": "発送後",
    "policy.cancel.afterP1":
      "発送後のご注文はキャンセルできません。受け取り拒否をするか、商品到着後に",
    "policy.cancel.afterP2": "に沿って返品ください。",
    "policy.cancel.customH": "オーダーメイド品",
    "policy.cancel.customP":
      "受注生産品やパーソナライズされたフィギュアは、製作開始後にキャンセルできません。",

    /* プライバシーポリシー */
    "policy.privacy.title": "プライバシーポリシー",
    "policy.privacy.metaDesc": "TOONHUB における情報の収集と利用について。",
    "policy.privacy.lead":
      "TOONHUB（以下「当店」）はお客様のプライバシーを尊重します。本ポリシーは、{domain} のご利用やご注文の際に、どのように情報を収集・利用・共有するかを説明するものです。",
    "policy.privacy.collectH": "収集する情報",
    "policy.privacy.collect1":
      "連絡先情報（氏名、メールアドレス、配送先住所、電話番号）",
    "policy.privacy.collect2": "注文履歴とカートの内容",
    "policy.privacy.collect3": "端末と利用状況（ブラウザ、閲覧ページ）",
    "policy.privacy.collect4": "Cookie に保存される通貨と言語の設定",
    "policy.privacy.useH": "利用目的",
    "policy.privacy.useP":
      "ご注文の処理、カスタマーサポート、発送に関するご連絡、ショップの改善、およびご希望の方への新商品・キャンペーンのご案内に利用します。お客様の個人情報を販売することはありません。",
    "policy.privacy.cookiesH": "Cookie について",
    "policy.privacy.cookiesP":
      "カート、通貨、言語に必須の Cookie を使用します。有効な場合、分析用 Cookie はトラフィックの把握に役立てています。Cookie はブラウザで管理できます。",
    "policy.privacy.sharingH": "第三者への提供",
    "policy.privacy.sharingP":
      "ご注文の履行に必要な範囲でのみ、決済事業者、配送業者、ホスティング事業者とデータを共有します。法令に基づき開示する場合があります。",
    "policy.privacy.rightsH": "お客様の権利",
    "policy.privacy.rightsP":
      "{email} 宛にご連絡いただければ、個人情報の開示・訂正・削除をご請求いただけます。EU／英国のお客様には GDPR に基づく権利があり、カリフォルニア州のお客様には CCPA に基づく追加の権利が認められる場合があります。",
    "policy.privacy.contactH": "お問い合わせ",

    /* 返金ポリシー */
    "policy.refund.title": "返金ポリシー",
    "policy.refund.metaDesc":
      "未使用の Toonhub フィギュアは30日間返品可能です。",
    "policy.refund.lead":
      "当店では30日間の返品ポリシーを設けています。商品到着後30日以内に返品をお申し込みいただけます。",
    "policy.refund.clearanceStrong": "クリアランス品はすべて返品不可です",
    "policy.refund.clearanceRest":
      "ただし、到着時に破損・不良があった場合を除きます。",
    "policy.refund.eligible":
      "返品対象となるには、商品が到着時と同じ状態（未使用・タグ付き・元のパッケージ）である必要があります。購入証明も必要です。オーダーメイド品は返品できません。",
    "policy.refund.startH": "返品手続き",
    "policy.refund.startP":
      "{email} までご連絡ください。承認後、返送先と手順をお知らせします。返送料はお客様のご負担です。事前の承認なく返送された商品は受け取れません。",
    "policy.refund.detailsH": "注文内容について",
    "policy.refund.detailsP":
      "ご注文前に内容をよくご確認ください。内容に誤りがあった場合は24時間以内にご連絡ください。発送後の住所変更はできない場合があります。",
    "policy.refund.damageH": "破損・不良",
    "policy.refund.damageP":
      "商品到着時に必ずご確認ください。破損・不良・誤配送は、写真とご注文番号を添えて48時間以内にご報告ください。速やかに対応いたします。",
    "policy.refund.refundsH": "返金",
    "policy.refund.refundsP":
      "返品商品を受け取り検品後、結果をお知らせします。承認された場合、10営業日以内に元のお支払い方法へ返金されます（金融機関の反映にはさらに時間がかかる場合があります）。",
    "policy.refund.euH": "EU の14日間クーリングオフ",
    "policy.refund.euP":
      "EU 加盟国への配送の場合、未使用かつ元のパッケージであれば、理由を問わず14日以内にキャンセル・返品が可能です。ただし、上記（オーダーメイド／クリアランス／使用後の破損）と矛盾する場合を除きます。",

    /* 配送ポリシー */
    "policy.shipping.title": "配送ポリシー",
    "policy.shipping.metaDesc": "Toonhub のフィギュアは全世界送料無料。",
    "policy.shipping.procH": "注文処理",
    "policy.shipping.procP1":
      "ご注文内容が正しいことを必ずご確認ください。誤った情報の送信による責任はお客様に帰属します。ご注文前に内容を確認するか、誤りがある場合は24時間以内にご連絡ください。",
    "policy.shipping.procP2":
      "すべてのご注文は2～3営業日以内に処理されます。週末や祝日の発送・配達は行いません。",
    "policy.shipping.confH": "確認メール",
    "policy.shipping.confP":
      "ご注文確定時に確認メールを、発送時には追跡番号付きのメールをお送りします。発送後の住所変更には配送業者の再配送料が発生する場合があります。",
    "policy.shipping.intlH": "海外配送",
    "policy.shipping.intlP":
      "対象国へ無料の国際配送を行っています。お届けの目安：",
    "policy.shipping.intl1":
      "アメリカ・イギリス・カナダ・オーストラリア・ヨーロッパ — 7～10営業日",
    "policy.shipping.intl2": "日本・韓国・中国・シンガポール — 5～7営業日",
    "policy.shipping.vatP":
      "価格に VAT は含まれません。該当する VAT や輸入関税は購入者のご負担となります。",
    "policy.shipping.trackH": "追跡",
    "policy.shipping.trackP1": "発送メールに記載の追跡番号、または当店の",
    "policy.shipping.trackP2":
      "ページをご利用ください。ご不明点は {email} まで。",
    "policy.shipping.issuesH": "配送トラブル",
    "policy.shipping.issuesP":
      "追跡情報が配達済みなのに荷物が届かない場合は、まず配送業者にお問い合わせください。破損して届いた場合は、ご注文番号と写真を添えて {email} までご連絡ください。",

    /* 利用規約 */
    "policy.terms.title": "利用規約",
    "policy.terms.metaDesc": "TOONHUB でのお買い物に関する利用規約。",
    "policy.terms.lead":
      "本サイトは TOONHUB が運営しています。本サイト内で「当店」とは TOONHUB を指します。本サイトのご利用や商品のご購入をもって、本利用規約に同意したものとみなされます。",
    "policy.terms.storeH": "オンラインストア条項",
    "policy.terms.storeP":
      "お客様は居住地における成年年齢に達していることを表明するものとします。当店の商品を違法な目的に使用したり、ウイルス等を送信したりすることはできません。本規約への違反は、サービスの終了をもたらす場合があります。",
    "policy.terms.generalH": "一般条件",
    "policy.terms.generalP":
      "当店は、理由の如何を問わずいつでも、いかなる方へのサービス提供も拒否する権利を留保します。書面による明示的な許可なく、本サービスの一部を複製・複写・販売・転売しないことに同意するものとします。",
    "policy.terms.accuracyH": "情報の正確性",
    "policy.terms.accuracyP":
      "本サイトの情報が正確・完全・最新でない場合、当店は責任を負いません。サイト上の情報は一般的な情報提供のみを目的としています。",
    "policy.terms.pricesH": "価格の変更",
    "policy.terms.pricesP":
      "商品価格は予告なく変更される場合があります。また、サービスを予告なく変更・終了する場合があります。",
    "policy.terms.productsH": "商品について",
    "policy.terms.productsP1": "一部の商品はオンライン限定で販売され、",
    "policy.terms.productsP2":
      "色や画像の表示には万全を期していますが、お使いのモニターでの再現を保証するものではありません。",
    "policy.terms.toolsH": "オプションツールと外部リンク",
    "policy.terms.toolsP":
      "第三者提供のツールへのアクセスを提供する場合があります。当店はそれらのツールを管理しておらず、その利用について責任を負いません。外部サイトへのリンクは便宜上提供するものです。",
    "policy.terms.commentsH": "ユーザーのコメント",
    "policy.terms.commentsP":
      "コメントやレビューを投稿された場合、それらを使用・複製・公開する非独占的な権利を当店に付与するものとします。コメントが第三者の権利を侵害せず、違法な内容を含まないことに同意するものとします。",
    "policy.terms.personalH": "個人情報",
    "policy.terms.personalP1": "個人情報の送信には当店の",
    "policy.terms.contactH": "お問い合わせ",
    "policy.terms.contactP":
      "利用規約に関するご質問は {email} までお送りください。",

    /* アカウントページ（静的） */
    "account.pageTitle": "マイアカウント",
    "account.homeTitle": "アカウント情報",
    "account.loginTitle": "ログイン",
    "account.registerTitle": "アカウント作成",
    "account.loginSub": "ログインしてご注文や会員特典をご確認ください。",
    "account.registerSub":
      "Toonhub アカウントを作成して、ご注文の追跡や会員特典をご利用ください。",
    "account.firstName": "名",
    "account.lastName": "姓",
    "account.emailPh": "メールアドレス",
    "account.password": "パスワード",
    "account.confirmPassword": "パスワード（確認）",
    "account.legalPrefix": "続行することで、Toonhub の",
    "account.legalAnd": "および",
    "account.logout": "ログアウト",
    "account.details": "アカウント詳細",
    "account.name": "氏名",
    "account.email": "メールアドレス",
    "account.phone": "電話番号",
    "account.save": "保存",
    "account.editProfile": "プロフィールを編集",
    "account.addresses": "お届け先住所",
    "account.orderHistory": "注文履歴",
    "account.parcelLabel": "荷物を追跡",
    "account.parcelPh": "追跡番号",
    "account.trackBtn": "追跡",
    "account.parcelNote1":
      "配送業者の追跡情報（17track）を確認できます。注文番号をお持ちの場合は",
    "account.parcelNote2": "もご利用いただけます。",
    "account.metaDesc": "ログインしてご注文、住所、追跡情報を確認。",

    /* アカウントページ（スクリプト用） */
    "account.msgPwdMismatch": "パスワードが一致しません",
    "account.msgLoading": "読み込み中…",
    "account.msgAuthFail":
      "ログインできません。メールアドレスとパスワードをご確認ください。",
    "account.msgSaveFail": "プロフィールを保存できませんでした",
    "account.noAddress":
      "保存された住所はまだありません。ご注文後にここへ表示されます。",
    "account.addressFromCheckout": "前回の購入手続きから",
    "account.noOrdersPre": "まだご注文がありません。",
    "account.browse": "フィギュアを見る",
    "account.orderFallback": "注文",
    "account.trackAfterShip": "発送後、追跡情報がここに表示されます。",
    "account.trackThis": "この注文を追跡",
    "account.carrierFallback": "配送業者",
    "account.welcomeBack": "おかえりなさい、{name} さん",

    /* チェックアウト（静的） */
    "checkout.title": "安全な購入手続き",
    "checkout.metaDesc": "安全な購入手続き — 全世界送料無料、30日間返品可能。",
    "checkout.crumbCart": "カート",
    "checkout.crumbCurrent": "購入手続き",
    "checkout.progressAria": "購入手続きの進行状況",
    "checkout.offerH": "期間限定オファー",
    "checkout.offerBody": "2点目割引 · チェックアウトで自動適用 · 全世界送料無料 · 30日間返品可能",
    "checkout.deliverTo": "お届け先",
    "checkout.change": "変更",
    "checkout.contact": "連絡先",
    "checkout.emailPh": "メールアドレス",
    "checkout.delivery": "配送情報",
    "checkout.countryAria": "国 / 地域",
    "checkout.countryOther": "その他 / リストにない",
    "checkout.countryNamePh": "国名",
    "checkout.countryOtherHint":
      "こちらの情報をもとに発送します。標準の国コードでない場合は、メールでご確認いたします。",
    "checkout.fullName": "お名前（フルネーム）",
    "checkout.address": "住所",
    "checkout.addApt": "+ 建物名・部屋番号",
    "checkout.apartment": "建物名・部屋番号など",
    "checkout.city": "市区町村",
    "checkout.postal": "郵便番号",
    "checkout.provincePh": "都道府県 / 州",
    "checkout.provinceOptionalPh": "都道府県 / 州（任意）",
    "checkout.addPhone": "+ 電話番号（配送連絡用）",
    "checkout.phonePh": "電話番号",
    "checkout.shipIncluded": "全世界送料無料",
    "checkout.newsletterAria": "新商品やキャンペーンのお知らせを受け取る",
    "checkout.payment": "お支払い",
    "checkout.payReservedH": "PayPal / Stripe / ウォレット用エリア",
    "checkout.payReservedBody":
      "お支払い方法は Medusa で設定されるとここに表示されます。このままご注文いただけます — 次の手順をメールでご案内します。",
    "checkout.yourOrder": "ご注文内容",
    "checkout.discountPh": "クーポンコード",
    "checkout.apply": "適用",
    "checkout.free": "無料",
    "checkout.placeOrder": "注文を確定する — 送料無料",
    "checkout.backToCart": "‹ カート",
    "checkout.secureNote": "安全な購入手続き",
    "checkout.legalPrefix":
      "注文を確定することで、以下に同意したものとみなされます：",
    "checkout.terms": "利用規約",
    "checkout.privacy": "プライバシーポリシー",
    "checkout.legalAnd": "および",

    /* チェックアウト（スクリプト用） */
    "checkout.msgEmptyCart": "カートは空です。",
    "checkout.msgProcessing": "処理中…",
    "checkout.msgPayNow": "今すぐ支払う",
    "checkout.msgPlaceOrder": "注文を確定する",
    "checkout.msgErrCountry": "国名を入力してください。",
    "checkout.msgErrProvince": "都道府県 / 州を選択してください。",
    "checkout.msgFailed": "購入手続きに失敗しました",
    "checkout.msgUnavailable": "購入手続きをご利用いただけません",
    "checkout.msgPaymentIncomplete": "お支払いが完了していません",
    "checkout.msgRequestFailed": "リクエストに失敗しました",
    "checkout.qtyEach": "数量 {qty} · 単価 {price}",
    "checkout.shipLineDefault": "全世界送料無料 · 2～3営業日で発送処理",
    "checkout.shippingNameFallback": "配送",
    "checkout.provinceSelectFirst": "都道府県 / 州を選択",
    "checkout.countryOtherFallback": "その他",

    /* 注文完了ページ */
    "success.metaDesc": "ご注文ありがとうございます — TOONHUB。",
    "success.heading": "ご注文ありがとうございます",
    "success.confirmed": "ご注文が確定しました。",
    "success.orderConfirmed": "注文 {order} が確定しました。",
    "success.receipt": " 領収書は {email} 宛にお送りします。",
    "success.nextH": "今後の流れ",
    "success.nextBody":
      "2～3営業日で梱包・発送 · 追跡付き全世界送料無料 · 30日間返品可能",
    "success.trackThis": "この注文を追跡",
  },
} as const satisfies Record<string, Record<string, string>>;
