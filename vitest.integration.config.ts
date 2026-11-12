import { defineConfig } from "vitest/config";

import unitConfig from "./vitest.config";

export default defineConfig({
  ...unitConfig,
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    hookTimeout: 60_000,
    testTimeout: 25_000,
  },
});
