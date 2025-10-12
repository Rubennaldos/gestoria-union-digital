import { ref, onValue, off } from "firebase/database";
import { db } from "@/config/firebase";

export class NotificationService {
  private listeners: Array<() => void> = [];
  private notifiedIds = new Set<string>();
  private isActive = false;
  private isFirstLoad = true;

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("Este navegador no soporta notificaciones");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  async start() {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn("No se otorgaron permisos de notificación");
      return;
    }

    this.isActive = true;
    this.setupListeners();
  }

  stop() {
    this.isActive = false;
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners = [];
    this.notifiedIds.clear();
    this.isFirstLoad = true;
  }

  private setupListeners() {
    // Escuchar visitas pendientes
    const visitasRef = ref(db, "acceso/visitas");
    const visitasListener = onValue(visitasRef, (snapshot) => {
      if (!this.isActive) return;
      
      const data = snapshot.val();
      if (!data) return;

      // En la primera carga, solo registrar IDs sin notificar
      if (this.isFirstLoad) {
        Object.entries(data).forEach(([id, registro]: [string, any]) => {
          if (registro.estado === "pendiente") {
            this.notifiedIds.add(id);
          }
        });
        this.isFirstLoad = false;
        return;
      }

      // En cargas subsecuentes, notificar solo nuevas solicitudes
      Object.entries(data).forEach(([id, registro]: [string, any]) => {
        if (
          registro.estado === "pendiente" &&
          !this.notifiedIds.has(id)
        ) {
          this.notifiedIds.add(id);
          this.sendNotification({
            title: "🔔 Nueva Solicitud de Visita",
            body: `${registro.solicitadoPorNombre || "Un asociado"} solicita autorización para visitante(s)`,
            tag: `visita-${id}`,
            data: { tipo: "visita", id, registro },
          });
        }
      });
    });

    // Escuchar trabajadores pendientes
    const trabajadoresRef = ref(db, "acceso/trabajadores");
    let isFirstLoadTrabajadores = true;
    const trabajadoresListener = onValue(trabajadoresRef, (snapshot) => {
      if (!this.isActive) return;
      
      const data = snapshot.val();
      if (!data) return;

      // En la primera carga, solo registrar IDs sin notificar
      if (isFirstLoadTrabajadores) {
        Object.entries(data).forEach(([id, registro]: [string, any]) => {
          if (registro.estado === "pendiente") {
            this.notifiedIds.add(id);
          }
        });
        isFirstLoadTrabajadores = false;
        return;
      }

      // En cargas subsecuentes, notificar solo nuevas solicitudes
      Object.entries(data).forEach(([id, registro]: [string, any]) => {
        if (
          registro.estado === "pendiente" &&
          !this.notifiedIds.has(id)
        ) {
          this.notifiedIds.add(id);
          this.sendNotification({
            title: "🔔 Nueva Solicitud de Trabajadores",
            body: `${registro.solicitadoPorNombre || "Un asociado"} solicita autorización para trabajador(es)`,
            tag: `trabajador-${id}`,
            data: { tipo: "trabajador", id, registro },
          });
        }
      });
    });

    // Escuchar proveedores pendientes
    const proveedoresRef = ref(db, "acceso/proveedores");
    let isFirstLoadProveedores = true;
    const proveedoresListener = onValue(proveedoresRef, (snapshot) => {
      if (!this.isActive) return;
      
      const data = snapshot.val();
      if (!data) return;

      // En la primera carga, solo registrar IDs sin notificar
      if (isFirstLoadProveedores) {
        Object.entries(data).forEach(([id, registro]: [string, any]) => {
          if (registro.estado === "pendiente") {
            this.notifiedIds.add(id);
          }
        });
        isFirstLoadProveedores = false;
        return;
      }

      // En cargas subsecuentes, notificar solo nuevas solicitudes
      Object.entries(data).forEach(([id, registro]: [string, any]) => {
        if (
          registro.estado === "pendiente" &&
          !this.notifiedIds.has(id)
        ) {
          this.notifiedIds.add(id);
          this.sendNotification({
            title: "🔔 Nueva Solicitud de Proveedor",
            body: `${registro.solicitadoPorNombre || "Un asociado"} solicita autorización para ${registro.empresa || "proveedor"}`,
            tag: `proveedor-${id}`,
            data: { tipo: "proveedor", id, registro },
          });
        }
      });
    });

    this.listeners = [
      () => off(visitasRef, "value", visitasListener),
      () => off(trabajadoresRef, "value", trabajadoresListener),
      () => off(proveedoresRef, "value", proveedoresListener),
    ];
  }

  private sendNotification(options: {
    title: string;
    body: string;
    tag: string;
    data: any;
  }) {
    if (Notification.permission !== "granted") return;

    const notification = new Notification(options.title, {
      body: options.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: options.tag,
      requireInteraction: true,
      data: options.data,
    });

    // Reproducir sonido de notificación
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLZiTYHGGS56+u');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('No se pudo reproducir sonido:', e));
    } catch (e) {
      console.log('Error al reproducir sonido:', e);
    }

    notification.onclick = () => {
      window.focus();
      if (window.location.hash !== "#/admin-seguridad") {
        window.location.hash = "#/admin-seguridad";
      }
      notification.close();
    };
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

// Instancia singleton
export const notificationService = new NotificationService();
