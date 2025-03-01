/**
 * WebSocket client utility for real-time updates
 */

// Event types that the WebSocket can emit
export type WebSocketEventType = 
  | 'connection'  // Initial connection established
  | 'chat'        // New chat message
  | 'analytics'   // Analytics update
  | 'repository'  // Repository changes
  | 'error'       // Error message
  | 'echo';       // Echo for testing

// Data structure for WebSocket messages
export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
  message?: string;
}

// Event listener type
type MessageListener = (message: WebSocketMessage) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<WebSocketEventType, Set<MessageListener>> = new Map();
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // ms

  /**
   * Connects to the WebSocket server
   */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // Determine the WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket server at ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);

      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.connected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Sends a message to the WebSocket server
   */
  send(type: WebSocketEventType, data: any): void {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message, WebSocket not connected');
      return;
    }

    try {
      const message: WebSocketMessage = { type, data };
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  /**
   * Adds an event listener for a specific message type
   */
  on(type: WebSocketEventType, listener: MessageListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
  }

  /**
   * Removes an event listener
   */
  off(type: WebSocketEventType, listener: MessageListener): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  /**
   * Handles WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connection established');
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Notify listeners of the connection
    this.notifyListeners({
      type: 'connection',
      message: 'Connected to WebSocket server'
    });
  }

  /**
   * Handles WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      this.notifyListeners(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handles WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.connected = false;
    this.scheduleReconnect();
  }

  /**
   * Handles WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.connected = false;
  }

  /**
   * Schedules a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Notifies all listeners for a specific message type
   */
  private notifyListeners(message: WebSocketMessage): void {
    const { type } = message;
    
    // Log all incoming messages (except frequent updates)
    if (type !== 'analytics') {
      console.log('WebSocket message received:', message);
    }
    
    // Notify type-specific listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error(`Error in WebSocket listener for type '${type}':`, error);
        }
      });
    }
  }

  /**
   * Returns whether the WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Create and export a singleton instance
const webSocketClient = new WebSocketClient();
export default webSocketClient;