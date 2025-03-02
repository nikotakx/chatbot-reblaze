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
  private maxReconnectAttempts = 10; // Increased for better resilience
  private reconnectDelay = 2000; // ms - starting delay
  private pingInterval: NodeJS.Timeout | null = null;
  private messageStats = {
    sent: 0,
    received: 0,
    errors: 0,
    lastMessageTime: 0
  };

  /**
   * Connects to the WebSocket server
   */
  connect(): void {
    // If already connected or connecting, don't try to connect again
    if (this.socket) {
      const state = this.socket.readyState;
      if (state === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      } else if (state === WebSocket.CONNECTING) {
        console.log('WebSocket already connecting');
        return;
      }
    }

    try {
      // Close any existing socket before creating a new one
      if (this.socket) {
        try {
          this.socket.close();
        } catch (error) {
          console.warn('Error closing existing WebSocket:', error);
        }
      }

      // Determine the WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use the actual hostname and port from the window.location
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
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect(): void {
    // Clear any pending timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close the socket if it exists
    if (this.socket) {
      try {
        // Send a clean disconnect message if possible
        if (this.socket.readyState === WebSocket.OPEN) {
          this.send('echo', { action: 'disconnect', reason: 'User initiated' });
        }
        this.socket.close();
      } catch (error) {
        console.warn('Error during WebSocket disconnect:', error);
      } finally {
        this.socket = null;
      }
    }

    // Reset connection state
    this.connected = false;
    this.reconnectAttempts = 0;
    
    console.log('WebSocket connection terminated by client');
  }

  /**
   * Sends a message to the WebSocket server
   */
  send(type: WebSocketEventType, data: any): boolean {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message, WebSocket not connected');
      return false;
    }

    try {
      const message: WebSocketMessage = { type, data };
      const messageStr = JSON.stringify(message);
      
      // Only log non-heartbeat messages to reduce console noise
      if (!(type === 'echo' && data && (data.ping || data.action === 'ping'))) {
        console.log('Sending WebSocket message:', type);
      }
      
      // Send the message
      this.socket.send(messageStr);
      
      // Update statistics
      this.messageStats.sent++;
      
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.messageStats.errors++;
      return false;
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
    
    // Clear any existing ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Set up a ping interval to help keep the connection alive
    // Send a small ping message every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send a minimal ping message
        this.send('echo', { ping: Date.now() });
        this.messageStats.sent++;
      } else {
        // If the socket is not open, clear the interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
      }
    }, 30000); // 30 seconds
    
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
      // Parse the message
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Update message statistics
      this.messageStats.received++;
      this.messageStats.lastMessageTime = Date.now();
      
      // Special handling for heartbeat messages
      if (message.type === 'echo' && message.data && message.data.message === 'Server heartbeat') {
        // Don't need to do anything special with heartbeats, but we could
        // update connection health metrics here
        
        // If the server sent statistics, log them but only occasionally
        if (message.data.stats && Math.random() < 0.2) { // Only log ~20% of the time to reduce noise
          console.log('WebSocket server stats:', message.data.stats);
        }
      }
      
      // Notify registered listeners about this message
      this.notifyListeners(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.messageStats.errors++;
    }
  }

  /**
   * Handles WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    // Clear any ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Clean close codes (1000, 1001, 1005) vs. error codes
    const isCleanClose = event.code === 1000 || event.code === 1001 || event.code === 1005;
    const reason = event.reason || (isCleanClose ? 'Normal closure' : 'Connection error');
    
    console.log(`WebSocket connection closed: ${event.code} ${reason}`);
    
    // Update connection state
    this.connected = false;
    
    // If it wasn't a clean close, try to reconnect
    if (!isCleanClose) {
      console.warn(`WebSocket closed with error code ${event.code}, attempting to reconnect...`);
      this.scheduleReconnect();
    } else if (event.code === 1001) {
      // Code 1001 means the page is unloading, so don't attempt to reconnect
      console.log('Page is unloading, not attempting WebSocket reconnection');
    } else {
      // For other clean closes, still try to reconnect after a short delay
      // This helps with temporary server restarts
      setTimeout(() => this.scheduleReconnect(), 2000);
    }
    
    // Notify listeners about the disconnection
    this.notifyListeners({
      type: 'error',
      message: `Connection closed: ${reason}`
    });
  }

  /**
   * Handles WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error encountered:', event);
    
    // Mark as disconnected
    this.connected = false;
    
    // Attempt to recover from the error by reconnecting
    this.scheduleReconnect();
    
    // Notify listeners of the error
    try {
      this.notifyListeners({
        type: 'error',
        message: 'Connection error occurred. Attempting to reconnect...'
      });
    } catch (notifyError) {
      console.error('Error notifying listeners about WebSocket error:', notifyError);
    }
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