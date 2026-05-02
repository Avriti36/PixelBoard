/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // avoids double-connecting socket in dev
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
