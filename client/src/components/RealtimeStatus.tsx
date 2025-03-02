import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SignalHigh, AlertCircle, RefreshCw, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RealtimeStatusProps {
  className?: string;
}

/**
 * Displays real-time connection status and handles WebSocket events
 */
export default function RealtimeStatus({ className = '' }: RealtimeStatusProps) {
  const { isConnected, lastMessage, reconnect } = useWebSocket(['connection', 'echo', 'error']);
  const [connectionTime, setConnectionTime] = useState<number | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Update last message time when we receive a new message
  useEffect(() => {
    if (lastMessage) {
      setLastMessageTime(Date.now());
      
      // Clear error message when we receive any message
      setErrorMessage(null);
      
      // If it's an error message, display it
      if (lastMessage.type === 'error' && lastMessage.message) {
        setErrorMessage(lastMessage.message);
      }
    }
  }, [lastMessage]);
  
  // Update connection time when connected
  useEffect(() => {
    if (isConnected && !connectionTime) {
      setConnectionTime(Date.now());
      setIsReconnecting(false);
    } else if (!isConnected) {
      setConnectionTime(null);
    }
  }, [isConnected, connectionTime]);
  
  // Format the connection duration
  const formatDuration = (startTime: number): string => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };
  
  // Get last activity time
  const getLastActivity = (): string => {
    if (!lastMessageTime) return 'No activity';
    
    const seconds = Math.floor((Date.now() - lastMessageTime) / 1000);
    
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    
    return `${Math.floor(seconds / 3600)}h ago`;
  };
  
  // Handle manual reconnection
  const handleReconnect = () => {
    setIsReconnecting(true);
    reconnect();
    setTimeout(() => {
      // If still not connected after 5 seconds, reset the reconnecting state
      if (!isConnected) {
        setIsReconnecting(false);
      }
    }, 5000);
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              {isConnected ? (
                <Badge variant="outline" className="flex gap-1 items-center px-2 py-0.5 text-xs bg-green-50 border-green-200 text-green-700">
                  <SignalHigh className="h-3 w-3" />
                  <span>Connected</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="flex gap-1 items-center px-2 py-0.5 text-xs bg-red-50 border-red-200 text-red-700">
                  <AlertCircle className="h-3 w-3" />
                  <span>Disconnected</span>
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-xs">
              <p className="font-bold mb-1">Real-time connection status:</p>
              <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
              {connectionTime && <p>Connected for: {formatDuration(connectionTime)}</p>}
              {lastMessageTime && <p>Last activity: {getLastActivity()}</p>}
              {errorMessage && <p className="text-red-600">Error: {errorMessage}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {!isConnected && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          onClick={handleReconnect}
          disabled={isReconnecting}
        >
          <RefreshCw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
          <span className="sr-only">Reconnect</span>
        </Button>
      )}
    </div>
  );
}