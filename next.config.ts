import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is a session-based dashboard: every page reads cookies and the
  // database per request, so the static-shell caching model adds no value.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
