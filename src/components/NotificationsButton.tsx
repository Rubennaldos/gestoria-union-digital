// src/components/NotificationsButton.tsx
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
            console.log("✅ FCM token:", token);
            alert("Token del dispositivo:\n\n" + token); // 👈 así lo ves en el CELULAR también
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
