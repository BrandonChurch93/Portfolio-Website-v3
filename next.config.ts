import type { NextConfig } from 'next';

// A name for this build, which the world's files are asked for by (src/pieces/world/files.ts): a file asked for by
// a build's name can be kept by the browser for good, since the next build asks for it by another.
const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now())).slice(0, 12);
const live = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  devIndicators: false,
  env: { NEXT_PUBLIC_BUILD: BUILD },
  async headers() {
    // Only on a built site: the dev server serves files that change under it.
    if (!live) return [];
    return [
      {
        // What costs nothing and breaks nothing: no sniffing of types, no framing by another site, a short referrer,
        // and none of the device's sensors.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
      {
        // The world's files, when asked for by this build's name.
        source: '/world/:file*',
        has: [{ type: 'query', key: 'v' }],
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Pictures and portraits: kept for an hour without asking, then shown at once while a fresh copy is fetched
        // behind. Served with no keeping at all, a visitor who came back asked again for every one before the page
        // could draw. Not longer than an hour: the narrow screens' pictures of the 3D pieces are taken again often.
        source: '/media/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
