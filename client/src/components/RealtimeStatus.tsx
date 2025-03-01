import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SignalHigh, AlertCircle } from 'lucide-react';

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
  
  // Update last message time when we receive a new message
  useEffect(() => {
    if (lastMessage) {
      setLastMessageTime(Date.now());
    }
  }, [lastMessage]);
  
  // Update connection time when connected
  useEffect(() => {
    if (isConnected && !connectionTime) {
      setConnectionTime(Date.now());
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
  
  return (
    <div className={`flex items-center ${className}`}>
      {isConnected ? (
        <Badge variant="outline" className="flex gap-1 items-center px-2 py-0.5 text-xs bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400">
          <SignalHigh className="h-3 w-3" />
          <span>Connected</span>
        </Badge>
      ) : (
        <Badge variant="outline" className="flex gap-1 items-center px-2 py-0.5 text-xs bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          <span>Disconnected</span>
        </Badge>
      )}
    </div>
  );
}