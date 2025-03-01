import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChatMessage as ChatMessageType, ChatResponse } from "@/lib/types";
import Message from "./Message";
import MessageInput from "./MessageInput";

interface LoadingIndicatorProps {}

function LoadingIndicator({}: LoadingIndicatorProps) {
  return (
    <div className="flex mb-2 loading-indicator">
      <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-t-lg rounded-br-lg max-w-xl">
        <div className="text-xs mb-1 font-medium text-secondary-700">
          DocChat
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Thinking</span>
          <div className="flex space-x-1">
            <div className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
            <div className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SuggestedQuestionProps {
  question: string;
  onSelect: (question: string) => void;
}

function SuggestedQuestion({ question, onSelect }: SuggestedQuestionProps) {
  return (
    <button 
      onClick={() => onSelect(question)}
      className="suggest-question px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-secondary-700 transition"
    >
      {question}
    </button>
  );
}

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = "" }: ChatInterfaceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Get chat history if a session ID exists
  const { data: chatHistoryData } = useQuery({
    queryKey: sessionId ? [`/api/chat/${sessionId}`] : [],
    enabled: !!sessionId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      console.log("Sending message to API:", message, "with sessionId:", sessionId);
      const response = await apiRequest("POST", "/api/chat", { 
        message, 
        sessionId 
      });
      const data = await response.json() as ChatResponse;
      console.log("API response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Mutation success, received data:", data);
      
      // If we don't have a session ID yet, set it
      if (!sessionId) {
        console.log("Setting session ID:", data.sessionId);
        setSessionId(data.sessionId);
      }
      
      // Invalidate the chat history query to refetch
      console.log("Invalidating query for session:", data.sessionId);
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${data.sessionId}`] });
      
      // Manually add AI response for immediate feedback in case the query refetch is slow
      const aiMessage: ChatMessageType = {
        id: Date.now(), // Temporary ID
        sessionId: data.sessionId,
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      
      console.log("Adding AI response to messages:", aiMessage);
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to send message:", error);
    }
  });

  // Update messages when chat history data changes
  useEffect(() => {
    // Type guard check for chat history data
    const isValidChatHistoryData = (data: unknown): data is { messages: ChatMessageType[] } => {
      return data !== null && 
             typeof data === 'object' && 
             'messages' in (data as Record<string, unknown>) && 
             Array.isArray((data as Record<string, unknown>).messages);
    };
    
    if (isValidChatHistoryData(chatHistoryData)) {
      console.log("Received chat history:", chatHistoryData.messages);
      setMessages(chatHistoryData.messages);
    }
  }, [chatHistoryData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, sendMessageMutation.isPending]);

  // Handle sending a message
  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message);
    
    // Add user message to UI immediately for better UX
    const userMessage: ChatMessageType = {
      id: Date.now(), // Temporary ID
      sessionId: sessionId || "temp",
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    console.log("Adding user message to state:", userMessage);
    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      console.log("Updated messages state:", newMessages);
      return newMessages;
    });
    
    // Send the message to the API
    sendMessageMutation.mutate(message);
  };

  // Suggested questions
  const suggestedQuestions = [
    "How do I install the product?",
    "Show me the dashboard interface",
    "What are the system requirements?",
  ];

  return (
    <main className={`flex-1 flex flex-col h-full ${className}`}>
      {/* Chat container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50" 
        id="chatContainer"
      >
        <div className="flex flex-col space-y-4 max-w-3xl mx-auto py-4">
          {/* Welcome message (only shown if no messages yet) */}
          {messages.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h1 className="text-xl font-semibold text-secondary-900 mb-3">Documentation Assistant</h1>
              <p className="text-secondary-600 mb-3">
                Welcome to the documentation assistant! I can help answer questions about your product based on the documentation.
              </p>
              <p className="text-secondary-600 mb-4">
                I can also display images from the documentation when relevant to your query.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <SuggestedQuestion 
                    key={index} 
                    question={question} 
                    onSelect={handleSendMessage} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {/* Loading indicator */}
          {sendMessageMutation.isPending && <LoadingIndicator />}
        </div>
      </div>
      
      {/* Message input */}
      <MessageInput 
        onSendMessage={handleSendMessage} 
        isLoading={sendMessageMutation.isPending} 
      />
    </main>
  );
}
