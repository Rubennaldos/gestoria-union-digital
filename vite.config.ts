import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // ✅ Dev (Lovable) usa '/', Build (GitHub Pages) usa el subpath del repo
  base: mode === "production" ? "/gestoria-union-digital/" : "/",

  server: { host: "::", port: 8080 },

  build: { outDir: "dist", emptyOutDir: true },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
}));
