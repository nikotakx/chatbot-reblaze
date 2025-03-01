// API Response Interfaces

// Chat Analytics
export interface ChatAnalytics {
  summary: {
    totalSessions: number;
    totalQueries: number;
    totalResponses: number;
    estimatedTokens: {
      input: number;
      output: number;
      total: number;
    };
  };
  timeSeries: Array<{
    date: string;
    queries: number;
    responses: number;
  }>;
  topQueryTerms: Array<{
    term: string;
    count: number;
  }>;
}

// Chat Sessions
export interface ChatSessions {
  sessions: Array<{
    sessionId: string;
    messageCount: number;
    startTime: string;
    lastActivity: string;
  }>;
}

// Repository Data
export interface RepositoryData {
  config: {
    id: number;
    url: string;
    branch: string;
    lastSynced: string | null;
    isActive: boolean;
  };
}

// Documentation Data
export interface DocumentationData {
  files: Array<{
    id: number;
    path: string;
    content: string;
    lastUpdated: string;
    hasImages: boolean;
    githubUrl?: string;
  }>;
}

// Documentation Stats
export interface DocumentationStats {
  fileCount: number;
  chunkCount: number;
  imageCount: number;
  lastSynced: string | null;
}