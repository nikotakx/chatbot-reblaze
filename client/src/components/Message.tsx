import { ChatMessage as ChatMessageType } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";

interface MessageProps {
  message: ChatMessageType;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex mb-4 ${isUser ? "justify-end" : ""}`}>
      <div
        className={`${
          isUser
            ? "bg-primary-100 border border-primary-200 px-4 py-2 rounded-t-lg rounded-bl-lg max-w-lg"
            : "bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-t-lg rounded-br-lg max-w-xl"
        }`}
      >
        <div className={`text-xs mb-1 font-medium ${isUser ? "text-primary-700" : "text-secondary-700"}`}>
          {isUser ? "You" : "DocChat"}
        </div>
        {isUser ? (
          <p className="mt-1 text-gray-800">{message.content}</p>
        ) : (
          <div className="mt-1">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
