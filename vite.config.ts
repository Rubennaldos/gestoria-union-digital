// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
  // Base para GitHub Pages: debe coincidir con el nombre del repo
  base: '/gestoria-union-digital/',
  server: { host: "::", port: 8080 },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
  plugins: [react(), mode === "development" ? componentTagger() : null].filter(
    Boolean
  ),
  resolve: { alias: { "@": resolve(__dirname, "src") } },
}));
