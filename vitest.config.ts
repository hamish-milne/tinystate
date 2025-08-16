import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    includeSource: ["lib/**/*.{ts,tsx}"],
    coverage: {
      include: ["lib/**/*.{ts,tsx}"],
    },
    environment: "happy-dom",
  },
});
