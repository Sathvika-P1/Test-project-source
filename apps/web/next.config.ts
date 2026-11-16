import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the browser same-origin with the API so a session cookie reaches it.
  // API_URL is the Shop API base URL (default: local API on port 3001).
  async rewrites() {
    const api = process.env.API_URL ?? "http://localhost:3001";
    return [{ source: "/api/:path*", destination: `${api}/:path*` }];
  },
};

export default nextConfig;
