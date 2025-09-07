// Tipos base para Worker que Vite necesita
interface Worker extends EventTarget {
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
  postMessage(message: any, transfer?: Transferable[]): void;
  terminate(): void;
}

interface AbstractWorker {
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
}

interface WorkerOptions {
  type?: "classic" | "module";
  credentials?: "omit" | "same-origin" | "include";
  name?: string;
}

declare var Worker: {
  prototype: Worker;
  new(scriptURL: string | URL, options?: WorkerOptions): Worker;
};