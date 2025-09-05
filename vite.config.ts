import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // importantísimo para GitHub Pages (ruta del repo)
  base: mode === "production" ? "/gestoria-union-digital/" : "/",

  server: {
    host: "::",
    port: 8080,
  },

  // GitHub Pages build configuration
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
