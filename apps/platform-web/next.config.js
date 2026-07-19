/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@innovatix/ui'],
  // Client sign-in lives at /clientportal; forward the old /login path.
  async redirects() {
    return [{ source: '/login', destination: '/clientportal', permanent: true }];
  },
};
