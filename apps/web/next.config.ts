import type { NextConfig } from "next";

/**
 * API_URL (optional): base URL of the Shop API, default http://localhost:3000.
 * Browser calls to /api/* are proxied there so the session cookie stays same-origin.
 */
const apiUrl = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
