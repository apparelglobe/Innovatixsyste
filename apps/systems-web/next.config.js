/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    // F1 baseline. Tightened (nonces) during Gate A hardening.
    value:
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@innovatix/ui', '@innovatix/analytics'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Same-origin proxy to the Innovatix API (lead pipeline) so the browser posts
  // to https://<site>/api/inx/* (which nginx already routes here on :4030) and
  // this server forwards to the API on localhost:4040 — no public API vhost, no
  // cross-origin CORS. Build with NEXT_PUBLIC_API_BASE_URL=https://<site>/api/inx.
  async rewrites() {
    const apiOrigin = process.env.INNOVATIX_API_ORIGIN || 'http://127.0.0.1:4040';
    return [{ source: '/api/inx/:path*', destination: `${apiOrigin}/v1/:path*` }];
  },
  // Canonicalize www -> apex (same-deployment). Singular domain -> apex is
  // configured at the Vercel domain level (defensive redirect domain).
  async redirects() {
    return [
      { source: '/contact/book', destination: '/book', permanent: true },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.innovatixmarketing.com' }],
        destination: 'https://innovatixmarketing.com/:path*',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
