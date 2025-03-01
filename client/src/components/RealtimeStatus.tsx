import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface RealtimeStatusProps {
  className?: string;
}

/**
 * Displays real-time connection status and handles WebSocket events
 */
export default function RealtimeStatus({ className = '' }: RealtimeStatusProps) {
  const { toast } = useToast();
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const { isConnected, lastMessage, reconnect } = useWebSocket([
    'chat',
    'analytics',
    'repository',
    'error',
    'echo'
  ]);

  // Calculate time since last message
  const getTimeSinceLastEvent = () => {
    if (!lastEventTime) return 'No events yet';
    const seconds = Math.floor((new Date().getTime() - lastEventTime.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Show toast notifications for specific events
  useEffect(() => {
    if (!lastMessage) return;

    // Update last event time and message count
    setLastEventTime(new Date());
    setMessageCount(prev => prev + 1);

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

    // Skip heartbeat echo messages
    if (lastMessage.type === 'echo' && lastMessage.message === 'Server heartbeat') {
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

  // Component for the tooltip content
  const StatusDetails = () => (
    <div className="text-xs">
      <p><strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p><strong>Last event:</strong> {getTimeSinceLastEvent()}</p>
      <p><strong>Messages received:</strong> {messageCount}</p>
      {!isConnected && <p className="italic mt-1">Click to reconnect</p>}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div 
            className={`flex items-center gap-2 ${className} ${!isConnected ? 'cursor-pointer' : ''}`}
            onClick={!isConnected ? handleReconnect : undefined}
          >
            <div className="flex items-center gap-1">
              <div 
                className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} 
                  ${isConnected && lastEventTime && 'animate-pulse'}`} 
                aria-hidden="true"
              />
              <Badge 
                variant={isConnected ? "outline" : "destructive"} 
                className="text-xs"
              >
                {isConnected ? 'Connected' : 'Disconnected'}
                {isConnected && lastEventTime && (
                  <span className="ml-1 text-xs opacity-70">
                    ({getTimeSinceLastEvent()})
                  </span>
                )}
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
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <StatusDetails />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}