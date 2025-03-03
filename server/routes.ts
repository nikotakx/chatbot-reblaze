import express, { Response } from "express";
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { v4 as uuidv4 } from "uuid";
import { fetchRepositoryFiles } from "./lib/github.improved";
import { processMarkdownForVectorStorage } from "./lib/markdown";
import { vectorStore } from "./lib/vectorStore";
import { chatWithDocumentation } from "./lib/openai";
import {
  askQuestionSchema,
  refreshRepositorySchema,
} from "@shared/schema";
import { 
  insertRepositoryConfigSchema, 
  repositoryConfig 
} from "./db/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { WebSocketServer, WebSocket } from "ws";

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
      // Increased from 5 to 7 results to provide better context with our improved chunking
      const searchResults = await vectorStore.search(message, 7);
      
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
      
      // Broadcast chat update via WebSocket
      broadcastMessage('chat', {
        sessionId: chatSessionId,
        messageCount: chatHistory.length + 2 // +2 for the new user message and AI response
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
      
      console.log(`Refreshing documentation from repository: ${url}, branch: ${branch}`);
      
      // Parse GitHub URL if it's in the format https://github.com/owner/repo
      let repoUrl = url;
      let repoBranch = branch || 'master'; // Default to master if branch not specified
      
      if (url.includes('github.com')) {
        // Extract owner and repo from URL
        const urlParts = url.replace(/\.git$/, '').split('/');
        const owner = urlParts[urlParts.length - 2];
        const repo = urlParts[urlParts.length - 1];
        
        if (!owner || !repo) {
          return res.status(400).json({ 
            error: "Invalid GitHub URL. Expected format: https://github.com/owner/repo" 
          });
        }
        
        console.log(`Parsed GitHub URL - Owner: ${owner}, Repo: ${repo}, Branch: ${repoBranch}`);
        
        // Format URL for API
        repoUrl = `${owner}/${repo}`;
      }
      
      // Fetch files from GitHub
      console.log(`Fetching files from ${repoUrl} (${repoBranch})`);
      const repoContent = await fetchRepositoryFiles(repoUrl, repoBranch);
      console.log(`Fetched ${repoContent.files.length} files and ${repoContent.images.length} images`);
      
      // Process and store the documentation files
      for (const file of repoContent.files) {
        console.log(`Processing file: ${file.path}`);
        // Check if file already exists by path
        const existingFile = await storage.getDocumentationFileByPath(file.path);
        
        let fileId: number;
        
        if (existingFile) {
          // Update existing file
          console.log(`Updating existing file: ${file.path} (ID: ${existingFile.id})`);
          const updatedFile = await storage.updateDocumentationFile(existingFile.id, file);
          fileId = updatedFile!.id;
        } else {
          // Create new file
          console.log(`Creating new file: ${file.path}`);
          const newFile = await storage.createDocumentationFile(file);
          fileId = newFile.id;
        }
        
        // Process and store images
        const fileImages = repoContent.images.filter(img => img.path === file.path);
        console.log(`Found ${fileImages.length} images for file: ${file.path}`);
        
        for (const image of fileImages) {
          // Use the actual file ID
          image.fileId = fileId;
          await storage.createDocumentationImage(image);
          console.log(`Stored image: ${image.url} for file ID: ${fileId}`);
        }
        
        // Get all images for this file for chunk processing
        const images = await storage.getDocumentationImagesByFileId(fileId);
        
        // Process file for vector storage
        console.log(`Processing ${file.path} for vector storage`);
        const chunks = await processMarkdownForVectorStorage(
          { ...file, id: fileId }, 
          fileId, 
          images
        );
        
        console.log(`Generated ${chunks.length} chunks for file: ${file.path}`);
        
        // Store chunks
        for (const chunk of chunks) {
          await storage.createDocumentationChunk(chunk);
        }
      }
      
      // Update repository config with last synced time
      const config = await storage.getRepositoryConfig();
      if (config) {
        console.log(`Updating repository config with last synced time`);
        await storage.updateRepositoryConfig(config.id, {
          url: config.url,
          branch: config.branch,
          isActive: config.isActive
        });
      }
      
      // Broadcast repository update via WebSocket
      broadcastMessage('repository', {
        lastUpdated: new Date().toISOString(),
        fileCount: repoContent.files.length,
        imageCount: repoContent.images.length
      });
      
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
        res.status(500).json({ 
          error: "Failed to refresh documentation",
          details: error instanceof Error ? error.message : String(error)
        });
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

  // Get all chat logs (admin only)
  apiRouter.get("/admin/chats", async (_req: Request, res: Response) => {
    try {
      // This endpoint will get all chat sessions
      // First, get all chat messages
      const allMessages = await storage.getAllChatMessages();
      
      // Group messages by sessionId
      const sessions = new Map();
      
      allMessages.forEach(message => {
        if (!sessions.has(message.sessionId)) {
          sessions.set(message.sessionId, {
            sessionId: message.sessionId,
            messages: [],
            startTime: message.timestamp,
            lastActivity: message.timestamp,
            messageCount: 0
          });
        }
        
        const session = sessions.get(message.sessionId);
        session.messageCount++;
        
        // Keep track of the first and last message timestamps
        if (new Date(message.timestamp) < new Date(session.startTime)) {
          session.startTime = message.timestamp;
        }
        
        if (new Date(message.timestamp) > new Date(session.lastActivity)) {
          session.lastActivity = message.timestamp;
        }
      });
      
      res.json({
        sessions: Array.from(sessions.values())
      });
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });
  
  // Get detailed analytics about system usage
  apiRouter.get("/admin/analytics", async (_req: Request, res: Response) => {
    try {
      const allMessages = await storage.getAllChatMessages();
      const totalQueries = allMessages.filter(msg => msg.role === 'user').length;
      const totalResponses = allMessages.filter(msg => msg.role === 'assistant').length;
      
      // Group by day for time-series data
      const messagesByDay = new Map();
      
      allMessages.forEach(message => {
        const date = new Date(message.timestamp).toISOString().split('T')[0];
        
        if (!messagesByDay.has(date)) {
          messagesByDay.set(date, { date, queries: 0, responses: 0 });
        }
        
        const dayData = messagesByDay.get(date);
        
        if (message.role === 'user') {
          dayData.queries++;
        } else if (message.role === 'assistant') {
          dayData.responses++;
        }
      });
      
      // Calculate token usage estimates (rough approximation)
      const userMessages = allMessages.filter(msg => msg.role === 'user');
      const assistantMessages = allMessages.filter(msg => msg.role === 'assistant');
      
      const estimatedTokenCount = {
        input: userMessages.reduce((sum, msg) => sum + (msg.content.length / 4), 0),
        output: assistantMessages.reduce((sum, msg) => sum + (msg.content.length / 4), 0)
      };
      
      // Find popular query terms
      const queryTerms = userMessages.flatMap(msg => 
        msg.content.toLowerCase()
           .replace(/[^\w\s]/g, '')
           .split(/\s+/)
           .filter(word => word.length > 3)
      );
      
      const termFrequency = queryTerms.reduce<Record<string, number>>((acc, term) => {
        if (term in acc) {
          acc[term] += 1;
        } else {
          acc[term] = 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Sort terms by frequency
      const topQueryTerms = Object.entries(termFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term, count]) => ({ 
          term, 
          count: count as number 
        }));
      
      const analyticsData = {
        summary: {
          totalSessions: new Set(allMessages.map(m => m.sessionId)).size,
          totalQueries,
          totalResponses,
          estimatedTokens: {
            input: Math.round(estimatedTokenCount.input),
            output: Math.round(estimatedTokenCount.output),
            total: Math.round(estimatedTokenCount.input + estimatedTokenCount.output)
          }
        },
        timeSeries: Array.from(messagesByDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
        topQueryTerms
      };
      
      // Broadcast analytics update via WebSocket
      broadcastMessage('analytics', {
        timestamp: new Date().toISOString(),
        summary: analyticsData.summary
      });
      
      res.json(analyticsData);
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });
  
  // Delete a chat message
  apiRouter.delete("/admin/chat/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      const success = await storage.deleteChatMessage(id);
      
      if (!success) {
        return res.status(404).json({ error: "Message not found or already deleted" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat message:", error);
      res.status(500).json({ error: "Failed to delete chat message" });
    }
  });
  
  // Purge all documentation chunks and files (used for reindexing)
  apiRouter.post("/admin/purge", async (_req: Request, res: Response) => {
    try {
      console.log("Purging all documentation data...");
      
      // First, get all chunks to delete them
      const allChunks = await storage.getAllDocumentationChunks();
      console.log(`Found ${allChunks.length} documentation chunks to purge`);
      
      // Delete all chunks
      let deletedChunks = 0;
      for (const chunk of allChunks) {
        const success = await storage.deleteDocumentationChunk(chunk.id);
        if (success) deletedChunks++;
      }
      
      // Get all documentation files
      const allFiles = await storage.getAllDocumentationFiles();
      console.log(`Found ${allFiles.length} documentation files to purge`);
      
      // For each file, delete associated images first
      let deletedImages = 0;
      let deletedFiles = 0;
      
      for (const file of allFiles) {
        // Delete associated images
        const images = await storage.getDocumentationImagesByFileId(file.id);
        for (const image of images) {
          const success = await storage.deleteDocumentationImage(image.id);
          if (success) deletedImages++;
        }
        
        // Delete the file
        const success = await storage.deleteDocumentationFile(file.id);
        if (success) deletedFiles++;
      }
      
      // Reset repository config last synced time
      const config = await storage.getRepositoryConfig();
      if (config) {
        await storage.updateRepositoryConfig(config.id, {
          url: config.url,
          branch: config.branch,
          isActive: config.isActive
          // lastSynced will be reset to NULL
        });
      }
      
      // Clear the vector store in memory
      await vectorStore.clear();
      
      // Broadcast update via WebSocket
      broadcastMessage('repository', {
        purged: true,
        timestamp: new Date().toISOString(),
        stats: {
          deletedChunks,
          deletedFiles,
          deletedImages
        }
      });
      
      res.json({
        success: true,
        purged: {
          chunks: deletedChunks,
          files: deletedFiles,
          images: deletedImages
        }
      });
      
    } catch (error) {
      console.error("Error purging documentation data:", error);
      res.status(500).json({ 
        error: "Failed to purge documentation data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  // Setup WebSocket server with ping interval to keep connections alive
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Setting a larger timeout to prevent premature disconnections
    clientTracking: true
  });

  // Connected clients
  const clients = new Set<WebSocket>();

  // WebSocket statistics for monitoring
  let totalConnections = 0;
  let currentConnections = 0;
  let messagesSent = 0;
  let messagesReceived = 0;

  // Event: server listening
  wss.on('listening', () => {
    console.log('WebSocket server is listening');
  });

  // Event: client connection
  wss.on('connection', (ws, req) => {
    totalConnections++;
    currentConnections = clients.size + 1;
    
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`WebSocket client connected from ${clientIp}. Total: ${currentConnections}, All-time: ${totalConnections}`);
    
    // Add to active clients
    clients.add(ws);

    // Send initial connection message
    const connectionMessage = {
      type: 'connection',
      message: 'Connected to Documentation Chatbot WebSocket server',
      stats: {
        connectedClients: currentConnections,
        totalConnections: totalConnections
      }
    };
    
    ws.send(JSON.stringify(connectionMessage));
    messagesSent++;

    // Set up a ping interval to keep the connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping(() => {});
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds

    // Event: message from client
    ws.on('message', (message) => {
      messagesReceived++;
      try {
        const data = JSON.parse(message.toString());
        console.log(`WebSocket message received from ${clientIp}:`, data);

        // Echo back the message (for testing purposes)
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'echo',
            data
          }));
          messagesSent++;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
          messagesSent++;
        }
      }
    });

    // Event: client disconnection
    ws.on('close', (code, reason) => {
      clearInterval(pingInterval);
      clients.delete(ws);
      currentConnections = clients.size;
      console.log(`WebSocket client disconnected with code ${code} and reason: ${reason || 'No reason provided'}. Remaining clients: ${currentConnections}`);
    });

    // Event: error
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientIp}:`, error);
      clients.delete(ws);
      currentConnections = clients.size;
    });
    
    // Event: pong (response to ping)
    ws.on('pong', () => {
      // Client is alive
    });
  });

  // Utility function to broadcast a message to all connected clients
  const broadcastMessage = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    let successCount = 0;
    
    clients.forEach(client => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
          messagesSent++;
          successCount++;
        }
      } catch (error) {
        console.error('Error broadcasting message to client:', error);
      }
    });
    
    if (type !== 'echo') { // Don't log heartbeats to reduce noise
      console.log(`Broadcast ${type} message to ${successCount}/${clients.size} clients`);
    }
    
    return successCount;
  };

  // Export the broadcast function to the global scope so it can be used in other modules
  (global as any).wsBroadcast = broadcastMessage;
  
  // Send a heartbeat message to check WebSocket connectivity and keep connections alive
  const heartbeatInterval = setInterval(() => {
    if (clients.size > 0) {
      console.log(`Broadcasting heartbeat to ${clients.size} connected clients. Stats: Sent=${messagesSent}, Received=${messagesReceived}`);
      broadcastMessage('echo', { 
        timestamp: new Date().toISOString(),
        message: 'Server heartbeat',
        stats: {
          connectedClients: clients.size,
          totalConnections: totalConnections,
          messagesSent: messagesSent,
          messagesReceived: messagesReceived
        }
      });
    }
  }, 10000); // 10 seconds
  
  // Clean up interval when server closes
  httpServer.on('close', () => {
    clearInterval(heartbeatInterval);
    console.log('WebSocket server closed, cleaned up intervals');
  });

  return httpServer;
}
