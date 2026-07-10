/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // The PWA manifest's start_url used to be /dashboard, a route that
      // never existed (dashboard is at /). Home screen icons installed
      // before that fix still launch to the old URL, which 404s -- this
      // redirect self-heals those already-installed shortcuts.
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
