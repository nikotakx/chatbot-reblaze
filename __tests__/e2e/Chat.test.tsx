import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../client/src/lib/queryClient';
import Chat from '../../client/src/pages/Chat';

// Mock the API request function
jest.mock('../../client/src/lib/queryClient', () => {
  const originalModule = jest.requireActual('../../client/src/lib/queryClient');
  return {
    ...originalModule,
    apiRequest: jest.fn().mockImplementation(() => 
      Promise.resolve({
        message: 'This is a mock response from the chatbot.',
        sessionId: '12345'
      })
    ),
    queryClient: originalModule.queryClient
  };
});

// Mock the WebSocket
jest.mock('../../client/src/lib/websocket', () => ({
  WebSocketClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    off: jest.fn(),
    send: jest.fn()
  }))
}));

describe('Chat Component', () => {
  beforeEach(() => {
    render(
      <QueryClientProvider client={queryClient}>
        <Chat />
      </QueryClientProvider>
    );
  });

  it('renders the chat interface', () => {
    expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('allows user to send a message and receive a response', async () => {
    const inputElement = screen.getByPlaceholderText(/Type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type and send a message
    fireEvent.change(inputElement, { target: { value: 'Hello chatbot' } });
    fireEvent.click(sendButton);

    // User message should appear
    expect(await screen.findByText('Hello chatbot')).toBeInTheDocument();

    // Wait for bot response
    await waitFor(() => {
      expect(screen.getByText('This is a mock response from the chatbot.')).toBeInTheDocument();
    });
  });
});