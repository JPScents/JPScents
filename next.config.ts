import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify provides CONTEXT at build time only. Keep it in the deployed build
  // so a mis-scoped runtime variable cannot enable live payments on a Preview.
  env: {
    JPSCENTS_NETLIFY_BUILD_CONTEXT:
      process.env.NETLIFY === "true" ? (process.env.CONTEXT ?? "unknown") : "",
  },
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/checkout/:access(status|quote)/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.jpscents.shop" }],
        destination: "https://jpscents.shop/:path*",
        permanent: true,
        basePath: false,
      },
    ];
  },
  logging: {
    // Server Function arguments can contain checkout contact and delivery data.
    serverFunctions: false,
  },
  experimental: {
    serverActions: {
      // The action envelope needs modest headroom above the validated 5 MiB file limit.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
