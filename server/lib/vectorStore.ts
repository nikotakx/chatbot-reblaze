import { DocumentationChunk } from "@shared/schema";
import { storage } from "../storage";
import { createEmbedding } from "./openai";

export interface SearchResult {
  chunk: DocumentationChunk;
  similarity: number;
}

// In-memory vector store for development purposes
export class VectorStore {
  constructor() {}

  // Find similar chunks to the query using cosine similarity
  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    try {
      // Get all chunks from storage
      const chunks = await storage.getAllDocumentationChunks();

      // If no chunks, return empty array
      if (chunks.length === 0) {
        return [];
      }

      // Create query embedding
      const queryEmbedding = await createEmbedding(query);

      // For each chunk, calculate cosine similarity
      const results: SearchResult[] = [];

      for (const chunk of chunks) {
        let chunkEmbedding: number[];

        // Parse embedding from string
        try {
          chunkEmbedding = chunk.embedding ? JSON.parse(chunk.embedding) : [];
        } catch (e) {
          console.warn(`Failed to parse embedding for chunk ${chunk.id}`);
          continue;
        }

        // Skip if no embedding
        if (!chunkEmbedding || chunkEmbedding.length === 0) {
          continue;
        }

        // Calculate cosine similarity
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        results.push({
          chunk,
          similarity
        });
      }

      // Sort by similarity (descending) and take top K
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      console.error("Error searching vector store:", error);
      return [];
    }
  }
}

// Cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Create a singleton instance to be used throughout the app
export const vectorStore = new VectorStore();
