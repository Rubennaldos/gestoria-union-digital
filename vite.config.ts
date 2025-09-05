import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// __dirname seguro en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
  // ✅ En build (GitHub Pages) usa el subpath exacto del repo
  base: mode === "production" ? "/gestoria-union-digital/" : "/",

  server: {
    host: "::", // accesible en LAN (IPv4/IPv6)
    port: 8080,
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    // sourcemap: true, // opcional
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
}));
