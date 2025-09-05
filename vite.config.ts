import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 👇 muy importante: para GitHub Pages usa el nombre exacto de tu repo
  base: mode === "production" ? "/gestoria-union-digital/" : "/",

  server: {
    host: true, // accesible en red local
    port: 8080,
  },

  build: {
    outDir: "dist",      // carpeta de salida
    emptyOutDir: true,   // limpia antes de generar
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
