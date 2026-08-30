import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
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
