import { ref, onValue, off } from "firebase/database";
import { db } from "@/config/firebase";

export class NotificationService {
  private listeners: Array<() => void> = [];
  private notifiedIds = new Set<string>();
  private isActive = false;
  private isFirstLoad = true;

  async requestPermission(): Promise<boolean> {
    console.log("[NotificationService] Verificando permisos...");
    if (!("Notification" in window)) {
      console.warn("[NotificationService] Este navegador no soporta notificaciones");
      return false;
    }

    console.log("[NotificationService] Estado actual de permisos:", Notification.permission);
    if (Notification.permission === "granted") {
      console.log("[NotificationService] Permisos ya otorgados");
      return true;
    }

    if (Notification.permission !== "denied") {
      console.log("[NotificationService] Solicitando permisos...");
      const permission = await Notification.requestPermission();
      console.log("[NotificationService] Resultado de solicitud:", permission);
      return permission === "granted";
    }

    console.warn("[NotificationService] Permisos denegados");
    return false;
  }

  async start() {
    console.log("[NotificationService] Iniciando servicio...");
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn("[NotificationService] No se otorgaron permisos de notificación");
      return;
    }

    this.isActive = true;
    console.log("[NotificationService] Servicio activado, configurando listeners...");
    this.setupListeners();
    console.log("[NotificationService] Listeners configurados correctamente");
  }

  stop() {
    this.isActive = false;
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners = [];
    this.notifiedIds.clear();
    this.isFirstLoad = true;
  }

  private setupListeners() {
    console.log("[NotificationService] Configurando listeners de Firebase...");
    console.log("[NotificationService] Base de datos:", db);
    
    // Escuchar visitas pendientes
    const visitasRef = ref(db, "acceso/visitas");
    console.log("[NotificationService] Referencia de visitas creada:", visitasRef);
    
    const visitasListener = onValue(
      visitasRef, 
      (snapshot) => {
        console.log("[NotificationService] Evento recibido de visitas");
        if (!this.isActive) {
          console.log("[NotificationService] Servicio inactivo, ignorando evento");
          return;
        }
        
        const data = snapshot.val();
        console.log("[NotificationService] Datos de visitas:", data ? Object.keys(data).length + " registros" : "sin datos");
        if (!data) return;

        // En la primera carga, solo registrar IDs sin notificar
        if (this.isFirstLoad) {
          console.log("[NotificationService] Primera carga - registrando IDs existentes sin notificar");
          Object.entries(data).forEach(([id, registro]: [string, any]) => {
            if (registro.estado === "pendiente") {
              this.notifiedIds.add(id);
              console.log("[NotificationService] Registrado ID existente:", id);
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
            console.log("[NotificationService] Nueva solicitud de visita detectada:", id);
            this.notifiedIds.add(id);
            this.sendNotification({
              title: "🔔 Nueva Solicitud de Visita",
              body: `${registro.solicitadoPorNombre || "Un asociado"} solicita autorización para visitante(s)`,
              tag: `visita-${id}`,
              data: { tipo: "visita", id, registro },
            });
          }
        });
      },
      (error) => {
        console.error("[NotificationService] Error en listener de visitas:", error);
      }
    );

    // Escuchar trabajadores pendientes
    const trabajadoresRef = ref(db, "acceso/trabajadores");
    let isFirstLoadTrabajadores = true;
    const trabajadoresListener = onValue(
      trabajadoresRef, 
      (snapshot) => {
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
      },
      (error) => {
        console.error("[NotificationService] Error en listener de trabajadores:", error);
      }
    );

    // Escuchar proveedores pendientes
    const proveedoresRef = ref(db, "acceso/proveedores");
    let isFirstLoadProveedores = true;
    const proveedoresListener = onValue(
      proveedoresRef, 
      (snapshot) => {
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
      },
      (error) => {
        console.error("[NotificationService] Error en listener de proveedores:", error);
      }
    );

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
    console.log("[NotificationService] Enviando notificación:", options.title);
    if (Notification.permission !== "granted") {
      console.warn("[NotificationService] No se puede enviar notificación - permisos no otorgados");
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: options.tag,
        requireInteraction: true,
        data: options.data,
      });

      console.log("[NotificationService] Notificación creada exitosamente");

      // Reproducir sonido de notificación
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLZiTYHGGS56+u');
        audio.volume = 0.5;
        audio.play()
          .then(() => console.log("[NotificationService] Sonido reproducido"))
          .catch(e => console.log('[NotificationService] No se pudo reproducir sonido:', e));
      } catch (e) {
        console.log('[NotificationService] Error al reproducir sonido:', e);
      }

      notification.onclick = () => {
        console.log("[NotificationService] Notificación clickeada");
        window.focus();
        if (window.location.hash !== "#/admin-seguridad") {
          window.location.hash = "#/admin-seguridad";
        }
        notification.close();
      };
    } catch (error) {
      console.error("[NotificationService] Error al crear notificación:", error);
    }
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
