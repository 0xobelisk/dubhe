export type WebSocketInstance = WebSocket;

export interface WebSocketConstructor {
  new (url: string): WebSocket;
}

export function createWebSocketClient(url: string): WebSocketInstance {
  if (typeof window !== 'undefined') {
    // Browser Environment
    return new WebSocket(url);
  } else {
    // Node.js Environment
    try {
      require.resolve('ws');
      const WebSocket = require('ws');
      return new WebSocket(url);
    } catch (e) {
      console.error('Failed to load WebSocket implementation:', e);
      throw new Error(
        'WebSocket implementation not available. Please install the "ws" package.'
      );
    }
  }
}

export function isWebSocketSupported(): boolean {
  if (typeof window !== 'undefined') {
    return typeof WebSocket !== 'undefined';
  }
  try {
    require.resolve('ws');
    return true;
  } catch {
    return false;
  }
}
