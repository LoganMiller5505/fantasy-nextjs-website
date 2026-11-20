import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stamped into the build, so the cached playoff-race results (app/statistics/_lib/data.ts) start
  // afresh with each deploy
  env: { STATS_BUILD: String(Date.now()) },
  experimental: {
    // Room for up to four tweet images (each shrunk in the browser first), under Vercel's 4.5 MB body limit
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // YouTube thumbnails used as covers for youtube gallery items
    remotePatterns: [new URL("https://i.ytimg.com/vi/**")],
  },
};

export default nextConfig;
