import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['crawlee', '@crawlee/puppeteer'],
};

export default nextConfig;
