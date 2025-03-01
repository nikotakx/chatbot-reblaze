import { pgTable, serial, text, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

// Main documentation files table
export const documentationFiles = pgTable("documentation_files", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  hasImages: boolean("has_images").default(false),
  githubUrl: text("github_url"),
});

// Documentation images table with reference to files
export const documentationImages = pgTable("documentation_images", {
  id: serial("id").primaryKey(),
  fileId: serial("file_id").references(() => documentationFiles.id),
  path: text("path").notNull(),
  url: text("url").notNull(),
  alt: text("alt"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Documentation chunks for vector search
export const documentationChunks = pgTable("documentation_chunks", {
  id: serial("id").primaryKey(),
  fileId: serial("file_id").references(() => documentationFiles.id),
  content: text("content").notNull(),
  metadata: json("metadata").notNull(),
  embedding: text("embedding"),  // Store embedding as JSON string
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Repository configuration
export const repositoryConfig = pgTable("repository_config", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  branch: text("branch").notNull(),
  lastSynced: timestamp("last_synced"),
  isActive: boolean("is_active").default(true),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Define types for easier insertion and selection
export type DocumentationFile = InferSelectModel<typeof documentationFiles>;
export type DocumentationImage = InferSelectModel<typeof documentationImages>;
export type DocumentationChunk = InferSelectModel<typeof documentationChunks>;
export type RepositoryConfig = InferSelectModel<typeof repositoryConfig>;
export type ChatMessage = InferSelectModel<typeof chatMessages>;

// Define insert schemas for validation
export const insertDocumentationFileSchema = createInsertSchema(documentationFiles).omit({
  id: true,
  lastUpdated: true,
});

export const insertDocumentationImageSchema = createInsertSchema(documentationImages).omit({
  id: true,
  lastUpdated: true,
});

export const insertDocumentationChunkSchema = createInsertSchema(documentationChunks).omit({
  id: true,
  lastUpdated: true,
});

export const insertRepositoryConfigSchema = createInsertSchema(repositoryConfig).omit({
  id: true,
  lastSynced: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

// Define insert types from schemas
export type InsertDocumentationFile = typeof insertDocumentationFileSchema._type;
export type InsertDocumentationImage = typeof insertDocumentationImageSchema._type;
export type InsertDocumentationChunk = typeof insertDocumentationChunkSchema._type;
export type InsertRepositoryConfig = typeof insertRepositoryConfigSchema._type;
export type InsertChatMessage = typeof insertChatMessageSchema._type;