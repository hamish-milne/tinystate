import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    includeSource: ["src/**/*.{ts,tsx}"],
    environment: "happy-dom",
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json-summary", "json"],
      reportOnFailure: true,
      include: ["src/**/*.ts"],
    },
  },
  build: {
    target: "esnext",
    minify: false,
  },
});
