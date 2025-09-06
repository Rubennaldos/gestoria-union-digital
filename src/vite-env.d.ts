/// <reference types="vite/client" />

// Declaración global para Worker si no está disponible
declare class Worker extends EventTarget {
  constructor(scriptURL: string | URL, options?: WorkerOptions);
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
  postMessage(message: any, transfer?: Transferable[]): void;
  terminate(): void;
}

interface WorkerOptions {
  credentials?: RequestCredentials;
  name?: string;
  type?: "classic" | "module";
}
