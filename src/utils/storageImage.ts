import { ref as refFromURL, getBlob, getBytes } from "firebase/storage";
import { storage } from "@/config/firebase";

export async function storageUrlToDataURL(url: string): Promise<string | null> {
  // Intento 1: SDK con getBlob
  try {
    const r = refFromURL(storage, url);
    const blob = await getBlob(r);
    return await blobToDataURL(blob);
  } catch (e) {
    console.error("Fallo con getBlob:", e);
  }

  // Intento 2: Fallback con getBytes
  try {
    const r = refFromURL(storage, url);
    const bytes = await getBytes(r);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const ext = (url.split("?")[0].split(".").pop() || "jpeg").toLowerCase();
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.error("Fallo con getBytes:", e);
  }

  // Intento 3: Fallback con fetch (ahora debería pasar CORS)
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return await blobToDataURL(blob);
    }
  } catch (e) {
    console.error("Fallo con fetch:", e);
  }

  return null;
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
