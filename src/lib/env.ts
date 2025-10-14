// src/lib/env.ts
export const isPreview = (): boolean => {
  if (typeof window === "undefined") return false;
  // Cubre los previews de Lovable y entornos similares con sandbox/iframe
  return window.location.hostname.includes("lovable.app");
};
