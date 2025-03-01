// Chat related types
export interface ChatMessage {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  sessionId: string;
}

// Documentation related types
export interface DocumentationFile {
  id: number;
  path: string;
  content: string;
  lastUpdated: string;
  hasImages: boolean;
  githubUrl?: string;
}

export interface DocumentationImage {
  id: number;
  fileId: number;
  path: string;
  url: string;
  alt?: string;
  lastUpdated: string;
}

export interface DocumentationChunk {
  id: number;
  fileId: number;
  content: string;
  metadata: {
    path: string;
    section: string;
    hasImage: boolean;
    imageUrl?: string;
    imageAlt?: string;
  };
  embedding: string;
  lastUpdated: string;
}

export interface RepositoryConfig {
  id: number;
  url: string;
  branch: string;
  lastSynced: string | null;
  isActive: boolean;
}

export interface DocumentationStats {
  fileCount: number;
  chunkCount: number;
  imageCount: number;
  lastSynced: string | null;
}
