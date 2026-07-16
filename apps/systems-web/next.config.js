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
  // Canonicalize www -> apex (same-deployment). Singular domain -> apex is
  // configured at the Vercel domain level (defensive redirect domain).
  async redirects() {
    return [
      { source: '/contact/book', destination: '/book', permanent: true },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.innovatixsystems.com' }],
        destination: 'https://innovatixsystems.com/:path*',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
