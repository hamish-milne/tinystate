import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { analyzer } from "vite-bundle-analyzer";

export default defineConfig({
  plugins: [tailwindcss(), analyzer()],
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
