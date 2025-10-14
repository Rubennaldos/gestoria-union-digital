// src/types/recibos.ts
export interface ReceiptItem {
  description: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptOrg {
  name: string;
  logoPath?: string | null;
}

export interface ReceiptCustomer {
  empadronadoId: string;
  name: string;
}

export interface ReceiptEvent {
  id: string;
  name: string;
  date?: string; // ISO
}

export interface ReceiptAttachment {
  url: string;     // puede ser dataURL (base64) o http(s)
  name?: string;
  type?: string;
  size?: number;
}

export interface Receipt {
  id: string;
  code: string;
  issuedAt: number;      // timestamp
  org: ReceiptOrg;
  customer: ReceiptCustomer;
  event: ReceiptEvent;
  items: ReceiptItem[];
  total: number;
  currency: "PEN";
  paymentMethod: "transferencia" | "efectivo" | "otro";
  notes: string | null;

  // 🔴 Clave para unificar botones:
  // Guardamos el PDF final, tal como se generó al pagar/inscribirse.
  // (Base64 data URL; RTDB lo aguanta sin problemas para PDFs de 100-500 KB)
  pdfDataUrl?: string;             

  // Para ubicarlo desde otras vistas:
  inscripcionId?: string;         
  movimientoId?: string | null;

  // Evidencias opcionales (ej. imagen del voucher)
  attachments?: ReceiptAttachment[];
}
