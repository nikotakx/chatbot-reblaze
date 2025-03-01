import { useEffect, useState, useCallback } from 'react';
import webSocketClient, { WebSocketEventType, WebSocketMessage } from '@/lib/websocket';

/**
 * React hook for using WebSocket connections in components
 * 
 * @param types - Array of event types to listen for
 * @returns An object with connection status and methods
 */
export function useWebSocket(types: WebSocketEventType[] = []) {
  const [isConnected, setIsConnected] = useState(webSocketClient.isConnected());
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Connect to WebSocket on component mount
  useEffect(() => {
    // Connect if not already connected
    if (!webSocketClient.isConnected()) {
      webSocketClient.connect();
    }

    // Always listen for connection events
    const handleConnection = (message: WebSocketMessage) => {
      setIsConnected(true);
      setLastMessage(message);
    };

    webSocketClient.on('connection', handleConnection);

    // Set up the message listeners
    const listeners: Record<string, (message: WebSocketMessage) => void> = {};

    // Create and register listeners for each requested type
    types.forEach(type => {
      const listener = (message: WebSocketMessage) => {
        // Update the latest message state
        setLastMessage(message);
      };
      
      // Store the listener reference to be able to remove it later
      listeners[type] = listener;
      
      // Register the listener with the WebSocket client
      try {
        webSocketClient.on(type, listener);
      } catch (error) {
        console.error(`Error registering listener for type '${type}':`, error);
      }
    });

    // Cleanup function
    return () => {
      webSocketClient.off('connection', handleConnection);
      
      // Remove all the registered listeners
      types.forEach(type => {
        if (listeners[type]) {
          webSocketClient.off(type, listeners[type]);
        }
      });
    };
  }, [types.join(',')]); // Re-run if types change

  // Send a message through the WebSocket
  const sendMessage = useCallback((type: WebSocketEventType, data: any) => {
    webSocketClient.send(type, data);
  }, []);

  // Reconnect to the WebSocket
  const reconnect = useCallback(() => {
    webSocketClient.disconnect();
    webSocketClient.connect();
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect
  };
}

export default useWebSocket;