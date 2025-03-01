import { z } from "zod";

// Export the types from server/db/schema.ts for client usage
export type {
  DocumentationFile,
  InsertDocumentationFile,
  DocumentationImage,
  InsertDocumentationImage,
  DocumentationChunk,
  InsertDocumentationChunk,
  RepositoryConfig,
  InsertRepositoryConfig,
  ChatMessage,
  InsertChatMessage,
} from "../server/db/schema";

// API schemas for client-server communication
export const askQuestionSchema = z.object({
  message: z.string().min(1, "Message is required"),
  sessionId: z.string().optional(),
});

export const refreshRepositorySchema = z.object({
  url: z.string().url("Must be a valid URL"),
  branch: z.string().default("main"),
});