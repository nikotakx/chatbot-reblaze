import { WebSocketMessage, WebSocketEventType } from '../../client/src/lib/websocket';

// Note: We can't directly test WebSocketClient because it interacts with the browser's WebSocket API
// Instead, we'll test the interface and message structure

describe('WebSocket Message Structure', () => {
  it('should create valid chat messages', () => {
    const message: WebSocketMessage = {
      type: 'chat',
      data: {
        sessionId: '12345',
        content: 'Hello, world!',
        timestamp: new Date().toISOString()
      }
    };

    expect(message.type).toBe('chat');
    expect(message.data).toBeDefined();
    expect(message.data.sessionId).toBe('12345');
    expect(message.data.content).toBe('Hello, world!');
    expect(message.data.timestamp).toBeDefined();
  });

  it('should create valid error messages', () => {
    const message: WebSocketMessage = {
      type: 'error',
      message: 'Something went wrong'
    };

    expect(message.type).toBe('error');
    expect(message.message).toBe('Something went wrong');
  });

  it('should handle all event types', () => {
    const eventTypes: WebSocketEventType[] = [
      'connection',
      'chat',
      'analytics',
      'repository',
      'error',
      'echo'
    ];

    // Create a message for each event type
    eventTypes.forEach(type => {
      const message: WebSocketMessage = { type };
      expect(message.type).toBe(type);
    });

    // Ensure we've tested all event types
    const eventTypeEnum: Record<WebSocketEventType, string> = {
      'connection': 'connection',
      'chat': 'chat',
      'analytics': 'analytics',
      'repository': 'repository',
      'error': 'error',
      'echo': 'echo'
    };

    expect(Object.keys(eventTypeEnum).length).toBe(eventTypes.length);
  });
});