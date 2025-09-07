/// <reference types="vite/client" />

// Fix for Worker type used by Vite
declare global {
  interface Worker extends EventTarget {
    onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
    onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
    postMessage(message: any, transfer?: Transferable[]): void;
    terminate(): void;
  }
  
  var Worker: {
    prototype: Worker;
    new(scriptURL: string | URL, options?: WorkerOptions): Worker;
  };
  
  interface WorkerOptions {
    credentials?: RequestCredentials;
    name?: string;
    type?: "classic" | "module";
  }
}
