import {
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
} from "./db/schema";

export interface IStorage {
  // Documentation Files
  getDocumentationFile(id: number): Promise<DocumentationFile | undefined>;
  getDocumentationFileByPath(path: string): Promise<DocumentationFile | undefined>;
  getAllDocumentationFiles(): Promise<DocumentationFile[]>;
  createDocumentationFile(file: InsertDocumentationFile): Promise<DocumentationFile>;
  updateDocumentationFile(id: number, file: Partial<InsertDocumentationFile>): Promise<DocumentationFile | undefined>;
  deleteDocumentationFile(id: number): Promise<boolean>;

  // Documentation Images
  getDocumentationImage(id: number): Promise<DocumentationImage | undefined>;
  getDocumentationImagesByFileId(fileId: number): Promise<DocumentationImage[]>;
  createDocumentationImage(image: InsertDocumentationImage): Promise<DocumentationImage>;
  updateDocumentationImage(id: number, image: Partial<InsertDocumentationImage>): Promise<DocumentationImage | undefined>;
  deleteDocumentationImage(id: number): Promise<boolean>;

  // Documentation Chunks
  getDocumentationChunk(id: number): Promise<DocumentationChunk | undefined>;
  getDocumentationChunksByFileId(fileId: number): Promise<DocumentationChunk[]>;
  getAllDocumentationChunks(): Promise<DocumentationChunk[]>;
  createDocumentationChunk(chunk: InsertDocumentationChunk): Promise<DocumentationChunk>;
  updateDocumentationChunk(id: number, chunk: Partial<InsertDocumentationChunk>): Promise<DocumentationChunk | undefined>;
  deleteDocumentationChunk(id: number): Promise<boolean>;

  // Repository Config
  getRepositoryConfig(): Promise<RepositoryConfig | undefined>;
  createRepositoryConfig(config: InsertRepositoryConfig): Promise<RepositoryConfig>;
  updateRepositoryConfig(id: number, config: Partial<InsertRepositoryConfig>): Promise<RepositoryConfig | undefined>;

  // Chat Messages
  getChatMessagesBySessionId(sessionId: string): Promise<ChatMessage[]>;
  getAllChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessage(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private documentationFiles: Map<number, DocumentationFile>;
  private documentationImages: Map<number, DocumentationImage>;
  private documentationChunks: Map<number, DocumentationChunk>;
  private repositoryConfigs: Map<number, RepositoryConfig>;
  private chatMessages: Map<number, ChatMessage>;
  
  private currentDocumentationFileId: number;
  private currentDocumentationImageId: number;
  private currentDocumentationChunkId: number;
  private currentRepositoryConfigId: number;
  private currentChatMessageId: number;

  constructor() {
    this.documentationFiles = new Map();
    this.documentationImages = new Map();
    this.documentationChunks = new Map();
    this.repositoryConfigs = new Map();
    this.chatMessages = new Map();
    
    this.currentDocumentationFileId = 1;
    this.currentDocumentationImageId = 1;
    this.currentDocumentationChunkId = 1;
    this.currentRepositoryConfigId = 1;
    this.currentChatMessageId = 1;
    
    // Add some example documentation
    this.seedData();
  }

  // Documentation Files
  async getDocumentationFile(id: number): Promise<DocumentationFile | undefined> {
    return this.documentationFiles.get(id);
  }

  async getDocumentationFileByPath(path: string): Promise<DocumentationFile | undefined> {
    return Array.from(this.documentationFiles.values()).find(
      (file) => file.path === path
    );
  }

  async getAllDocumentationFiles(): Promise<DocumentationFile[]> {
    return Array.from(this.documentationFiles.values());
  }

  async createDocumentationFile(file: InsertDocumentationFile): Promise<DocumentationFile> {
    const id = this.currentDocumentationFileId++;
    const timestamp = new Date();
    const documentationFile: DocumentationFile = { 
      ...file, 
      id, 
      lastUpdated: timestamp,
      hasImages: file.hasImages ?? false,
      githubUrl: file.githubUrl ?? null
    };
    this.documentationFiles.set(id, documentationFile);
    return documentationFile;
  }

  async updateDocumentationFile(id: number, file: Partial<InsertDocumentationFile>): Promise<DocumentationFile | undefined> {
    const existingFile = this.documentationFiles.get(id);
    if (!existingFile) return undefined;

    const updatedFile: DocumentationFile = {
      ...existingFile,
      ...file,
      lastUpdated: new Date(),
    };
    
    this.documentationFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deleteDocumentationFile(id: number): Promise<boolean> {
    return this.documentationFiles.delete(id);
  }

  // Documentation Images
  async getDocumentationImage(id: number): Promise<DocumentationImage | undefined> {
    return this.documentationImages.get(id);
  }

  async getDocumentationImagesByFileId(fileId: number): Promise<DocumentationImage[]> {
    return Array.from(this.documentationImages.values()).filter(
      (image) => image.fileId === fileId
    );
  }

  async createDocumentationImage(image: InsertDocumentationImage): Promise<DocumentationImage> {
    const id = this.currentDocumentationImageId++;
    const timestamp = new Date();
    const documentationImage: DocumentationImage = { 
      ...image, 
      id, 
      lastUpdated: timestamp,
      fileId: image.fileId ?? 0,
      alt: image.alt ?? null
    };
    this.documentationImages.set(id, documentationImage);
    return documentationImage;
  }

  async updateDocumentationImage(id: number, image: Partial<InsertDocumentationImage>): Promise<DocumentationImage | undefined> {
    const existingImage = this.documentationImages.get(id);
    if (!existingImage) return undefined;

    const updatedImage: DocumentationImage = {
      ...existingImage,
      ...image,
      lastUpdated: new Date(),
    };
    
    this.documentationImages.set(id, updatedImage);
    return updatedImage;
  }

  async deleteDocumentationImage(id: number): Promise<boolean> {
    return this.documentationImages.delete(id);
  }

  // Documentation Chunks
  async getDocumentationChunk(id: number): Promise<DocumentationChunk | undefined> {
    return this.documentationChunks.get(id);
  }

  async getDocumentationChunksByFileId(fileId: number): Promise<DocumentationChunk[]> {
    return Array.from(this.documentationChunks.values()).filter(
      (chunk) => chunk.fileId === fileId
    );
  }

  async getAllDocumentationChunks(): Promise<DocumentationChunk[]> {
    return Array.from(this.documentationChunks.values());
  }

  async createDocumentationChunk(chunk: InsertDocumentationChunk): Promise<DocumentationChunk> {
    const id = this.currentDocumentationChunkId++;
    const timestamp = new Date();
    const documentationChunk: DocumentationChunk = { 
      ...chunk, 
      id, 
      lastUpdated: timestamp,
      fileId: chunk.fileId ?? 0,
      embedding: chunk.embedding ?? null
    };
    this.documentationChunks.set(id, documentationChunk);
    return documentationChunk;
  }

  async updateDocumentationChunk(id: number, chunk: Partial<InsertDocumentationChunk>): Promise<DocumentationChunk | undefined> {
    const existingChunk = this.documentationChunks.get(id);
    if (!existingChunk) return undefined;

    const updatedChunk: DocumentationChunk = {
      ...existingChunk,
      ...chunk,
      lastUpdated: new Date(),
    };
    
    this.documentationChunks.set(id, updatedChunk);
    return updatedChunk;
  }

  async deleteDocumentationChunk(id: number): Promise<boolean> {
    return this.documentationChunks.delete(id);
  }

  // Repository Config
  async getRepositoryConfig(): Promise<RepositoryConfig | undefined> {
    if (this.repositoryConfigs.size === 0) return undefined;
    // Return the first repository config (we'll only have one in this app)
    return Array.from(this.repositoryConfigs.values())[0];
  }

  async createRepositoryConfig(config: InsertRepositoryConfig): Promise<RepositoryConfig> {
    const id = this.currentRepositoryConfigId++;
    // Create a properly typed RepositoryConfig object
    const repositoryConfig: RepositoryConfig = { 
      ...config, 
      id, 
      lastSynced: new Date(),
      isActive: config.isActive ?? true
    };
    this.repositoryConfigs.set(id, repositoryConfig);
    return repositoryConfig;
  }

  async updateRepositoryConfig(id: number, config: Partial<InsertRepositoryConfig>): Promise<RepositoryConfig | undefined> {
    const existingConfig = this.repositoryConfigs.get(id);
    if (!existingConfig) return undefined;

    const updatedConfig: RepositoryConfig = {
      ...existingConfig,
      ...config,
    };
    
    this.repositoryConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // Chat Messages
  async getChatMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  async getAllChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const timestamp = new Date();
    const chatMessage: ChatMessage = { 
      ...message, 
      id, 
      timestamp
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }
  
  async deleteChatMessage(id: number): Promise<boolean> {
    return this.chatMessages.delete(id);
  }

  // Add some sample data for testing
  private seedData() {
    // Add repository config
    this.createRepositoryConfig({
      url: "https://github.com/acme/product-docs",
      branch: "main",
      isActive: true
    });

    // Add sample documentation files
    this.createDocumentationFile({
      path: "getting-started.md",
      content: `# Getting Started
      
Welcome to our product! This guide will help you get up and running quickly.

## Installation

Install our product using npm:

\`\`\`
npm install @product/core
\`\`\`

## Basic Usage

Import the package in your code:

\`\`\`javascript
import { Product } from '@product/core';

const product = new Product();
product.init();
\`\`\`

## System Requirements

- Operating System: Windows 10/11, macOS 10.15+, or Ubuntu 20.04+
- RAM: Minimum 4GB, 8GB recommended
- Disk Space: At least 2GB free space
- Processor: 2GHz dual-core or better
- Node.js: v14 or higher
- Database: MongoDB 4.4+ or PostgreSQL 12+
`,
      hasImages: false,
      githubUrl: "https://github.com/acme/product-docs/blob/main/getting-started.md"
    });

    this.createDocumentationFile({
      path: "dashboard.md",
      content: `# Dashboard

The dashboard provides an overview of your system's key metrics and performance indicators.

## Layout

The dashboard is divided into customizable widgets that can be arranged according to your preferences.

![Dashboard interface showing various metrics](https://images.unsplash.com/photo-1551288049-bebda4e38f71)

## Available Widgets

- **User Activity**: Shows active users over time
- **Revenue**: Displays current revenue metrics
- **System Health**: Monitors system performance
- **Recent Events**: Lists latest system events

## Customization

You can customize your dashboard by clicking the "Customize" button in the top-right corner.
`,
      hasImages: true,
      githubUrl: "https://github.com/acme/product-docs/blob/main/dashboard.md"
    });

    this.createDocumentationFile({
      path: "authentication.md",
      content: `# Authentication

This guide explains how to set up and configure authentication for your application.

## Configuration

Here's how you can configure the authentication settings in the application:

1. Navigate to Settings > Authentication
2. Choose the auth provider (OAuth, JWT, or Basic)
3. Enter your credentials
4. Click Save

![Authentication settings panel](https://images.unsplash.com/photo-1566837945700-30057527ade0)

## Authentication Providers

We support multiple authentication providers:

- **OAuth**: Connect with Google, GitHub, etc.
- **JWT**: Use JSON Web Tokens
- **Basic Auth**: Simple username/password authentication

## Security Best Practices

Always use HTTPS and rotate your credentials regularly.
`,
      hasImages: true,
      githubUrl: "https://github.com/acme/product-docs/blob/main/authentication.md"
    });

    // Add images
    this.createDocumentationImage({
      fileId: 2, // Dashboard file
      path: "dashboard.md",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
      alt: "Dashboard interface showing various metrics"
    });

    this.createDocumentationImage({
      fileId: 3, // Authentication file
      path: "authentication.md",
      url: "https://images.unsplash.com/photo-1566837945700-30057527ade0",
      alt: "Authentication settings panel"
    });

    // Add chunks (simplified for in-memory storage)
    this.createDocumentationChunk({
      fileId: 1,
      content: "Welcome to our product! This guide will help you get up and running quickly.",
      metadata: { path: "getting-started.md", section: "intro" },
      embedding: ""
    });

    this.createDocumentationChunk({
      fileId: 1,
      content: "Install our product using npm: npm install @product/core",
      metadata: { path: "getting-started.md", section: "installation" },
      embedding: ""
    });

    this.createDocumentationChunk({
      fileId: 1,
      content: `System Requirements:
- Operating System: Windows 10/11, macOS 10.15+, or Ubuntu 20.04+
- RAM: Minimum 4GB, 8GB recommended
- Disk Space: At least 2GB free space
- Processor: 2GHz dual-core or better
- Node.js: v14 or higher
- Database: MongoDB 4.4+ or PostgreSQL 12+`,
      metadata: { path: "getting-started.md", section: "requirements" },
      embedding: ""
    });

    this.createDocumentationChunk({
      fileId: 2,
      content: "The dashboard provides an overview of your system's key metrics and performance indicators.",
      metadata: { path: "dashboard.md", section: "intro", hasImage: false },
      embedding: ""
    });

    this.createDocumentationChunk({
      fileId: 2,
      content: "The dashboard is divided into customizable widgets that can be arranged according to your preferences.",
      metadata: { 
        path: "dashboard.md", 
        section: "layout", 
        hasImage: true,
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
        imageAlt: "Dashboard interface showing various metrics"
      },
      embedding: ""
    });

    this.createDocumentationChunk({
      fileId: 3,
      content: `Here's how you can configure the authentication settings in the application:
1. Navigate to Settings > Authentication
2. Choose the auth provider (OAuth, JWT, or Basic)
3. Enter your credentials
4. Click Save`,
      metadata: { 
        path: "authentication.md", 
        section: "configuration", 
        hasImage: true,
        imageUrl: "https://images.unsplash.com/photo-1566837945700-30057527ade0",
        imageAlt: "Authentication settings panel"
      },
      embedding: ""
    });
  }
}

// Database Storage implementation
import { db } from "./db";
import { 
  documentationFiles, 
  documentationImages, 
  documentationChunks, 
  repositoryConfig, 
  chatMessages 
} from "./db/schema";
import { 
  eq, 
  and, 
  desc 
} from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Documentation Files
  async getDocumentationFile(id: number): Promise<DocumentationFile | undefined> {
    const [file] = await db.select().from(documentationFiles).where(eq(documentationFiles.id, id));
    return file;
  }

  async getDocumentationFileByPath(path: string): Promise<DocumentationFile | undefined> {
    const [file] = await db.select().from(documentationFiles).where(eq(documentationFiles.path, path));
    return file;
  }

  async getAllDocumentationFiles(): Promise<DocumentationFile[]> {
    return await db.select().from(documentationFiles);
  }

  async createDocumentationFile(file: InsertDocumentationFile): Promise<DocumentationFile> {
    // Ensure all required fields have values
    const fileToInsert = {
      ...file,
      hasImages: file.hasImages ?? false,
      githubUrl: file.githubUrl ?? null
    };
    
    const [createdFile] = await db.insert(documentationFiles).values(fileToInsert).returning();
    return createdFile;
  }

  async updateDocumentationFile(id: number, file: Partial<InsertDocumentationFile>): Promise<DocumentationFile | undefined> {
    const [updatedFile] = await db
      .update(documentationFiles)
      .set({
        ...file,
        lastUpdated: new Date()
      })
      .where(eq(documentationFiles.id, id))
      .returning();
    return updatedFile;
  }

  async deleteDocumentationFile(id: number): Promise<boolean> {
    const [deletedFile] = await db
      .delete(documentationFiles)
      .where(eq(documentationFiles.id, id))
      .returning();
    return !!deletedFile;
  }

  // Documentation Images
  async getDocumentationImage(id: number): Promise<DocumentationImage | undefined> {
    const [image] = await db.select().from(documentationImages).where(eq(documentationImages.id, id));
    return image;
  }

  async getDocumentationImagesByFileId(fileId: number): Promise<DocumentationImage[]> {
    return await db
      .select()
      .from(documentationImages)
      .where(eq(documentationImages.fileId, fileId));
  }

  async createDocumentationImage(image: InsertDocumentationImage): Promise<DocumentationImage> {
    // Ensure all required fields have values
    const imageToInsert = {
      ...image,
      fileId: image.fileId ?? 0, // This should be a valid file ID in production
      alt: image.alt ?? null
    };
    
    const [createdImage] = await db.insert(documentationImages).values(imageToInsert).returning();
    return createdImage;
  }

  async updateDocumentationImage(id: number, image: Partial<InsertDocumentationImage>): Promise<DocumentationImage | undefined> {
    const [updatedImage] = await db
      .update(documentationImages)
      .set({
        ...image,
        lastUpdated: new Date()
      })
      .where(eq(documentationImages.id, id))
      .returning();
    return updatedImage;
  }

  async deleteDocumentationImage(id: number): Promise<boolean> {
    const [deletedImage] = await db
      .delete(documentationImages)
      .where(eq(documentationImages.id, id))
      .returning();
    return !!deletedImage;
  }

  // Documentation Chunks
  async getDocumentationChunk(id: number): Promise<DocumentationChunk | undefined> {
    const [chunk] = await db.select().from(documentationChunks).where(eq(documentationChunks.id, id));
    return chunk;
  }

  async getDocumentationChunksByFileId(fileId: number): Promise<DocumentationChunk[]> {
    return await db
      .select()
      .from(documentationChunks)
      .where(eq(documentationChunks.fileId, fileId));
  }

  async getAllDocumentationChunks(): Promise<DocumentationChunk[]> {
    return await db.select().from(documentationChunks);
  }

  async createDocumentationChunk(chunk: InsertDocumentationChunk): Promise<DocumentationChunk> {
    // Ensure all required fields have values
    const chunkToInsert = {
      ...chunk,
      fileId: chunk.fileId ?? 0, // This should be a valid file ID in production
      embedding: chunk.embedding ?? null
    };
    
    const [createdChunk] = await db.insert(documentationChunks).values(chunkToInsert).returning();
    return createdChunk;
  }

  async updateDocumentationChunk(id: number, chunk: Partial<InsertDocumentationChunk>): Promise<DocumentationChunk | undefined> {
    const [updatedChunk] = await db
      .update(documentationChunks)
      .set({
        ...chunk,
        lastUpdated: new Date()
      })
      .where(eq(documentationChunks.id, id))
      .returning();
    return updatedChunk;
  }

  async deleteDocumentationChunk(id: number): Promise<boolean> {
    const [deletedChunk] = await db
      .delete(documentationChunks)
      .where(eq(documentationChunks.id, id))
      .returning();
    return !!deletedChunk;
  }

  // Repository Config
  async getRepositoryConfig(): Promise<RepositoryConfig | undefined> {
    const [config] = await db
      .select()
      .from(repositoryConfig)
      .where(eq(repositoryConfig.isActive, true))
      .limit(1);
    return config;
  }

  async createRepositoryConfig(config: InsertRepositoryConfig): Promise<RepositoryConfig> {
    // Ensure all required fields have values
    const configToInsert = {
      ...config,
      isActive: config.isActive ?? true
    };
    
    const [createdConfig] = await db.insert(repositoryConfig).values(configToInsert).returning();
    return createdConfig;
  }

  async updateRepositoryConfig(id: number, config: Partial<InsertRepositoryConfig>): Promise<RepositoryConfig | undefined> {
    const [updatedConfig] = await db
      .update(repositoryConfig)
      .set(config)
      .where(eq(repositoryConfig.id, id))
      .returning();
    return updatedConfig;
  }

  // Chat Messages
  async getChatMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.timestamp);
  }
  
  async getAllChatMessages(): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.timestamp));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [createdMessage] = await db.insert(chatMessages).values(message).returning();
    return createdMessage;
  }
  
  async deleteChatMessage(id: number): Promise<boolean> {
    const [deletedMessage] = await db
      .delete(chatMessages)
      .where(eq(chatMessages.id, id))
      .returning();
    return !!deletedMessage;
  }
}

// Switch to the DatabaseStorage implementation
export const storage = new DatabaseStorage();

// Seed the database if needed (uncomment to initialize data)
// async function seedDatabase() {
//   // Check if we already have data
//   const existingConfig = await storage.getRepositoryConfig();
//   if (existingConfig) return;
//
//   // Add repository config
//   const config = await storage.createRepositoryConfig({
//     url: "https://github.com/acme/product-docs",
//     branch: "main",
//     isActive: true
//   });
//
//   // Add your seed data here similar to the MemStorage seedData method
// }
//
// seedDatabase().catch(console.error);
