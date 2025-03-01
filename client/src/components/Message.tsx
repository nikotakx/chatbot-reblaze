import { ChatMessage as ChatMessageType } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";

interface MessageProps {
  message: ChatMessageType;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex mb-2 ${isUser ? "justify-end" : ""}`}>
      <div 
        className={`${
          isUser 
            ? "bg-primary-600 text-white px-4 py-2 rounded-t-lg rounded-bl-lg max-w-lg" 
            : "bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-t-lg rounded-br-lg max-w-xl"
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-sm">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
