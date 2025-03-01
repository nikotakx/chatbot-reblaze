import express, { Response } from "express";
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { v4 as uuidv4 } from "uuid";
import { fetchRepositoryFiles } from "./lib/github";
import { processMarkdownForVectorStorage } from "./lib/markdown";
import { vectorStore } from "./lib/vectorStore";
import { chatWithDocumentation } from "./lib/openai";
import {
  askQuestionSchema,
  refreshRepositorySchema,
  insertRepositoryConfigSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes (prefix with /api)
  const apiRouter = express.Router();

  // Health check endpoint
  apiRouter.get("/health", async (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Chat API endpoint
  apiRouter.post("/chat", async (req: Request, res: Response) => {
    try {
      const { message, sessionId } = askQuestionSchema.parse(req.body);
      
      // Generate a session ID if not provided
      const chatSessionId = sessionId || uuidv4();
      
      // Get chat history for this session
      const chatHistory = await storage.getChatMessagesBySessionId(chatSessionId);
      
      // Format chat history for OpenAI
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Save user message
      await storage.createChatMessage({
        sessionId: chatSessionId,
        role: "user",
        content: message
      });
      
      // Search for relevant documentation
      const searchResults = await vectorStore.search(message, 5);
      
      // Generate response from OpenAI
      const aiResponse = await chatWithDocumentation(
        message,
        searchResults,
        formattedHistory
      );
      
      // Save assistant message
      await storage.createChatMessage({
        sessionId: chatSessionId,
        role: "assistant",
        content: aiResponse
      });
      
      // Return response
      res.json({
        message: aiResponse,
        sessionId: chatSessionId
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Error in chat endpoint:", error);
        res.status(500).json({ error: "An error occurred processing your request" });
      }
    }
  });

  // Get chat history for a session
  apiRouter.get("/chat/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessagesBySessionId(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Admin endpoints
  // Get documentation files
  apiRouter.get("/admin/documentation", async (_req: Request, res: Response) => {
    try {
      const files = await storage.getAllDocumentationFiles();
      res.json({ files });
    } catch (error) {
      console.error("Error fetching documentation files:", error);
      res.status(500).json({ error: "Failed to fetch documentation files" });
    }
  });

  // Get a specific documentation file
  apiRouter.get("/admin/documentation/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      const file = await storage.getDocumentationFile(id);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Get images associated with this file
      const images = await storage.getDocumentationImagesByFileId(id);
      
      res.json({ file, images });
    } catch (error) {
      console.error("Error fetching documentation file:", error);
      res.status(500).json({ error: "Failed to fetch documentation file" });
    }
  });

  // Get repository configuration
  apiRouter.get("/admin/repository", async (_req: Request, res: Response) => {
    try {
      const config = await storage.getRepositoryConfig();
      res.json({ config });
    } catch (error) {
      console.error("Error fetching repository config:", error);
      res.status(500).json({ error: "Failed to fetch repository configuration" });
    }
  });

  // Set/update repository configuration
  apiRouter.post("/admin/repository", async (req: Request, res: Response) => {
    try {
      const repositoryData = insertRepositoryConfigSchema.parse(req.body);
      
      // Check if a config already exists
      const existingConfig = await storage.getRepositoryConfig();
      
      let config;
      if (existingConfig) {
        // Update existing config
        config = await storage.updateRepositoryConfig(existingConfig.id, repositoryData);
      } else {
        // Create new config
        config = await storage.createRepositoryConfig(repositoryData);
      }
      
      res.json({ config });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Error updating repository config:", error);
        res.status(500).json({ error: "Failed to update repository configuration" });
      }
    }
  });

  // Refresh documentation from GitHub
  apiRouter.post("/admin/refresh", async (req: Request, res: Response) => {
    try {
      const { url, branch } = refreshRepositorySchema.parse(req.body);
      
      // Fetch files from GitHub
      const repoContent = await fetchRepositoryFiles(url, branch);
      
      // Process and store the documentation files
      for (const file of repoContent.files) {
        // Check if file already exists by path
        const existingFile = await storage.getDocumentationFileByPath(file.path);
        
        let fileId: number;
        
        if (existingFile) {
          // Update existing file
          const updatedFile = await storage.updateDocumentationFile(existingFile.id, file);
          fileId = updatedFile!.id;
        } else {
          // Create new file
          const newFile = await storage.createDocumentationFile(file);
          fileId = newFile.id;
        }
        
        // Process and store images
        const fileImages = repoContent.images.filter(img => img.path === file.path);
        for (const image of fileImages) {
          // Use the actual file ID
          image.fileId = fileId;
          await storage.createDocumentationImage(image);
        }
        
        // Get all images for this file for chunk processing
        const images = await storage.getDocumentationImagesByFileId(fileId);
        
        // Process file for vector storage
        const chunks = await processMarkdownForVectorStorage(
          { ...file, id: fileId }, 
          fileId, 
          images
        );
        
        // Store chunks
        for (const chunk of chunks) {
          await storage.createDocumentationChunk(chunk);
        }
      }
      
      // Update repository config with last synced time
      const config = await storage.getRepositoryConfig();
      if (config) {
        await storage.updateRepositoryConfig(config.id, {
          ...config,
          lastSynced: new Date()
        });
      }
      
      res.json({ 
        success: true, 
        filesProcessed: repoContent.files.length,
        imagesProcessed: repoContent.images.length
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Error refreshing documentation:", error);
        res.status(500).json({ error: "Failed to refresh documentation" });
      }
    }
  });

  // Get documentation statistics
  apiRouter.get("/admin/stats", async (_req: Request, res: Response) => {
    try {
      const files = await storage.getAllDocumentationFiles();
      const chunks = await storage.getAllDocumentationChunks();
      
      // Count images across all files
      let imageCount = 0;
      for (const file of files) {
        const fileImages = await storage.getDocumentationImagesByFileId(file.id);
        imageCount += fileImages.length;
      }
      
      // Get repository config for last synced time
      const config = await storage.getRepositoryConfig();
      
      res.json({
        fileCount: files.length,
        chunkCount: chunks.length,
        imageCount,
        lastSynced: config?.lastSynced || null
      });
    } catch (error) {
      console.error("Error fetching documentation stats:", error);
      res.status(500).json({ error: "Failed to fetch documentation statistics" });
    }
  });

  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
