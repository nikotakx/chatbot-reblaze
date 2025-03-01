import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

interface RealtimeStatusProps {
  className?: string;
}

/**
 * Displays real-time connection status and handles WebSocket events
 */
export default function RealtimeStatus({ className = '' }: RealtimeStatusProps) {
  const { toast } = useToast();
  const { isConnected, lastMessage, reconnect } = useWebSocket([
    'chat',
    'analytics',
    'repository',
    'error'
  ]);

  // Show toast notifications for specific events
  useEffect(() => {
    if (!lastMessage) return;

    // Don't show toasts for connection messages
    if (lastMessage.type === 'connection') return;

    // Show error messages as errors
    if (lastMessage.type === 'error') {
      toast({
        title: 'WebSocket Error',
        description: lastMessage.message || 'An error occurred with the real-time connection',
        variant: 'destructive',
      });
      return;
    }

    // Format toast based on message type
    let toastConfig;
    
    switch (lastMessage.type) {
      case 'chat':
        toastConfig = {
          title: 'New Chat Message',
          description: 'A new chat message has been received'
        };
        break;
      case 'analytics':
        toastConfig = {
          title: 'Analytics Updated',
          description: 'Dashboard analytics have been updated'
        };
        break;
      case 'repository':
        toastConfig = {
          title: 'Repository Updated',
          description: 'Documentation repository has been updated'
        };
        break;
      case 'echo':
        toastConfig = {
          title: 'Echo Received',
          description: 'Received echo response from server'
        };
        break;
      default:
        // Skip other message types
        toastConfig = null;
    }

    if (toastConfig) {
      toast({
        title: toastConfig.title,
        description: lastMessage.message || toastConfig.description,
      });
    }
  }, [lastMessage, toast]);

  const handleReconnect = () => {
    reconnect();
    toast({
      title: 'Reconnecting',
      description: 'Attempting to reconnect to real-time updates...'
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <div 
          className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
          aria-hidden="true"
        />
        <Badge variant={isConnected ? "outline" : "destructive"} className="text-xs">
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>
      
      {!isConnected && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReconnect}
          className="h-7 px-2"
        >
          <RefreshCcw className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">Reconnect</span>
        </Button>
      )}
    </div>
  );
}