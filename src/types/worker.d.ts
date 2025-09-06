// Worker type declaration for Vite compatibility
interface WorkerOptions {
  name?: string;
  type?: 'classic' | 'module';
}

interface Worker extends EventTarget {
  postMessage(message: any): void;
  terminate(): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

declare var Worker: {
  prototype: Worker;
  new(scriptURL: string | URL, options?: WorkerOptions): Worker;
};