/** @type {import('next').NextConfig} */
// Single backend (Zing Flask). For local dev: http://localhost:5000
// For Railway: set NEXT_PUBLIC_API_URL to your backend service URL (no trailing slash)
// If you see "Failed to proxy ... ECONNRESET" or "socket hang up", the backend is not running:
//   From repo root run: make dev   (starts backend + web)  OR  make dev-backend  (then in another terminal: make dev-web)
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1';

const nextConfig = {
  reactStrictMode: true,
  // Use current working directory as Turbopack root (run next from web/) so parent lockfiles are ignored
  turbopack: { root: process.cwd() },
  ...(isCapacitorBuild && {
    output: 'export',
    trailingSlash: true,
  }),
  // Enable standalone output for Docker (e.g. Railway)
  ...(!isCapacitorBuild && { output: 'standalone' }),
  images: {
    remotePatterns: [],
    ...(isCapacitorBuild && { unoptimized: true }),
  },
  async rewrites() {
    if (isCapacitorBuild) return [];
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
