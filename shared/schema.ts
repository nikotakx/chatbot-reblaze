import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Documentation files table
export const documentationFiles = pgTable("documentation_files", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  hasImages: boolean("has_images").default(false),
  githubUrl: text("github_url"),
});

export const insertDocumentationFileSchema = createInsertSchema(documentationFiles).pick({
  path: true,
  content: true,
  hasImages: true,
  githubUrl: true,
});

// Images extracted from documentation
export const documentationImages = pgTable("documentation_images", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  path: text("path").notNull(),
  url: text("url").notNull(),
  alt: text("alt"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertDocumentationImageSchema = createInsertSchema(documentationImages).pick({
  fileId: true,
  path: true,
  url: true,
  alt: true,
});

// Chunks created from documentation for vector embedding
export const documentationChunks = pgTable("documentation_chunks", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  embedding: text("embedding"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertDocumentationChunkSchema = createInsertSchema(documentationChunks).pick({
  fileId: true,
  content: true,
  metadata: true,
  embedding: true,
});

// Repository configuration
export const repositoryConfig = pgTable("repository_config", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  branch: text("branch").notNull().default("main"),
  lastSynced: timestamp("last_synced"),
  isActive: boolean("is_active").default(true),
});

export const insertRepositoryConfigSchema = createInsertSchema(repositoryConfig).pick({
  url: true,
  branch: true,
  isActive: true,
});

// Chat history
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  sessionId: true,
  role: true,
  content: true,
});

// Define types
export type DocumentationFile = typeof documentationFiles.$inferSelect;
export type InsertDocumentationFile = z.infer<typeof insertDocumentationFileSchema>;

export type DocumentationImage = typeof documentationImages.$inferSelect;
export type InsertDocumentationImage = z.infer<typeof insertDocumentationImageSchema>;

export type DocumentationChunk = typeof documentationChunks.$inferSelect;
export type InsertDocumentationChunk = z.infer<typeof insertDocumentationChunkSchema>;

export type RepositoryConfig = typeof repositoryConfig.$inferSelect;
export type InsertRepositoryConfig = z.infer<typeof insertRepositoryConfigSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Additional zod schemas for API requests/responses
export const askQuestionSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
});

export const refreshRepositorySchema = z.object({
  url: z.string().url(),
  branch: z.string().optional(),
});
