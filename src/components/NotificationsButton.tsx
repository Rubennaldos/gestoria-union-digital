import { useState } from "react";
import { requestAndGetFcmToken } from "@/messaging";

export function NotificationsButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const token = await requestAndGetFcmToken();
          if (!token) {
            alert("No se pudo activar notificaciones. Revisa permisos del navegador.");
          } else {
            // TODO: si quieres, guarda el token en tu DB
            alert("Notificaciones activadas ✅");
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Activando..." : "Activar Notificaciones"}
    </button>
  );
}
