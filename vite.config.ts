import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
  // ✅ Para GitHub Pages:
  // 1) Si VITE_BASE viene del workflow, úsalo.
  // 2) Si no, en producción assume /pecaditos-web/ (nombre del repo).
  // 3) En dev => "/"
  base: process.env.VITE_BASE ?? (mode === "production" ? "/pecaditos-web/" : "/"),

  server: { host: "::", port: 8080 },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
  plugins: [react(), mode === "development" ? componentTagger() : null].filter(Boolean),
  resolve: { alias: { "@": resolve(__dirname, "src") } },
}));
