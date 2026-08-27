import { defineConfig } from "vitest/config";

// Deliberately free of the app's Vite plugins (vinext / Cloudflare): these are
// unit tests over the library's pure logic and geometry, with no worker
// runtime and no browser involved.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
