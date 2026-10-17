import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep native/Node-only packages out of the webpack bundle so they load via
  // require() at runtime (needed for pg and the node-cron scheduler used by
  // the instrumentation hook).
  serverExternalPackages: ["pg", "node-cron"],
};

export default nextConfig;
