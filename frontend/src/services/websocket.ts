export const createAlertSocket = () => new WebSocket(import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001');
