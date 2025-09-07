/// <reference types="vite/client" />

// Temporary fix for Worker type issue
interface Worker {}
declare var Worker: any;
