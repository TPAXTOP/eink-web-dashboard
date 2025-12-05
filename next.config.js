/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images for e-paper display
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables that should be available on the client (none needed)
  // env: {},

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = nextConfig

