const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy.
//
// 'unsafe-inline' on script-src is a real weakening and is here deliberately:
// the App Router emits inline bootstrap scripts, and removing it requires
// per-request nonces generated in middleware. That is the correct next step,
// but it changes how every page is rendered, so it is not something to slip in
// alongside a performance pass. Everything else is locked down, and the
// directives that block the most common attacks — frame-ancestors, object-src,
// base-uri, form-action — are all strict.
//
// 'unsafe-eval' is dev-only: React Fast Refresh needs it, production does not.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // data: and blob: are what next/image uses for placeholders and optimisation.
  // Meta Pixel is intentionally limited to PageView in MetaPixel.tsx. Its
  // fallback beacon is an image request to facebook.com.
  "img-src 'self' data: blob: https://www.facebook.com",
  // next/font self-hosts at build time, so no external font host is needed.
  "font-src 'self'",
  // Supabase is the only host the browser talks to directly. Twilio and the
  // WhatsApp Graph API are called from server routes, never from the page.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.facebook.com https://connect.facebook.net",
  "script-src-elem 'self' https://connect.facebook.net",
  "media-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // A LAN dev server runs on HTTP and has no TLS certificate. Enabling this
  // directive in development upgrades every asset/navigation to HTTPS and
  // causes ERR_SSL_PROTOCOL_ERROR on http://<local-ip>:3000. Production on
  // Vercel remains HTTPS-enforced.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors above, kept for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Only has any effect over HTTPS, so it is inert locally and active on Vercel.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev` and `next build` share one output directory and overwrite each
  // other. Running a build while the dev server is up replaces its compiled CSS
  // chunks with production ones, and the running site then renders as unstyled
  // HTML until `.next` is cleared and dev is restarted.
  //
  // Setting NEXT_DIST_DIR sends a build somewhere else instead, so a build can
  // be used to verify a change without disturbing anyone's dev server. Unset in
  // normal use and in production, so this defaults to Next's own `.next`.
  // See `npm run build:check`.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Server identification tells an attacker which framework and version to
  // target. Nothing needs it.
  poweredByHeader: false,

  experimental: {
    // How long the CLIENT-side Router Cache may serve a previously visited
    // route without asking the server again. Next's default for a dynamic route
    // is 30 seconds.
    //
    // That default is why the admin screens each called `router.refresh()` the
    // moment they mounted: without it, clicking back to a page you had opened
    // within the last 30 seconds re-showed the cached copy, so Inventory could
    // insist a sold car was still in stock. The refresh fixed the staleness by
    // rendering the page on the server a SECOND time — once for the navigation,
    // once immediately afterwards — which doubled the cost of every sidebar
    // click and is what made the dashboard feel slow.
    //
    // Keep prefetched and recently visited admin routes in the client Router
    // Cache for 30 seconds. Sidebar links are prefetched, so their ready RSC
    // payload can paint immediately instead of waiting for the UAE-to-Tokyo
    // database round trip after every click. Mutations still call
    // router.refresh(), and mounted data screens revalidate quietly below.
    staleTimes: {
      dynamic: 30,
      // Static routes (the public marketing pages) keep Next's default. They
      // have no per-request data and re-fetching them buys nothing.
      static: 300,
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The dashboard and the API must never appear in search results. This
        // is enforced at the header rather than in robots.txt, because a
        // robots rule is a request and this is not.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
