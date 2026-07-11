/** @type {import('next').NextConfig} */
const withSerwistInit = require('@serwist/next').default

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
})

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = withSerwist(nextConfig)
