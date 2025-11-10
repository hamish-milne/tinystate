import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    includeSource: ["src/**/*.{ts,tsx}"],
    environment: "happy-dom",
  },
  build: {
    target: "esnext",
    minify: false,
  },
});
