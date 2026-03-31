// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
  base: '/',
  server: { host: "::", port: 8080 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      // Supabase JS v2.100+ usa conditional exports ("import"/"require").
      // Rollup necesita "import" en su lista de condiciones para resolverlo.
      // Sin esto, falla en entornos de build limpio (como Vercel).
      output: {},
    },
  },
  plugins: [react(), mode === "development" ? componentTagger() : null].filter(
    Boolean
  ),
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
    // Agrega "import" y "default" para que Rollup resuelva correctamente
    // los paquetes con conditional exports como @supabase/supabase-js
    conditions: ["browser", "module", "import", "default"],
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js"],
    esbuildOptions: {
      // Asegura que esbuild también resuelva el paquete correctamente
      mainFields: ["module", "main"],
    },
  },
}));
