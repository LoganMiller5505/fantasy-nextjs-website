import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stamped into the build, so the cached playoff-race results (app/statistics/_lib/data.ts) start
  // afresh with each deploy
  env: { STATS_BUILD: String(Date.now()) },
  images: {
    // YouTube thumbnails used as covers for youtube gallery items
    remotePatterns: [new URL("https://i.ytimg.com/vi/**")],
  },
};

export default nextConfig;
