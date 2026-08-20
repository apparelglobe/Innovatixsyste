/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@innovatix/ui'],
  // Client sign-in lives at /clientportal; forward the old /login path.
  // S5.3 — the standalone Milestones/Reports/Files/Team routes are folded into the Projects hub;
  // forward each to its hub tab (temporary redirects: the portal is internal + noindex, and this
  // keeps the reorg reversible without browsers caching a permanent redirect).
  async redirects() {
    return [
      { source: '/login', destination: '/clientportal', permanent: true },
      { source: '/milestones', destination: '/projects?tab=milestones', permanent: false },
      { source: '/reports', destination: '/projects?tab=reports', permanent: false },
      { source: '/files', destination: '/projects?tab=files', permanent: false },
      { source: '/team', destination: '/projects?tab=team', permanent: false },
    ];
  },
};
