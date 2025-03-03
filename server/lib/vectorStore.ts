import { DocumentationChunk } from "@shared/schema";
import { storage } from "../storage";
import { createEmbedding } from "./openai";

export interface SearchResult {
  chunk: DocumentationChunk;
  similarity: number;
}

// In-memory vector store for development purposes
export class VectorStore {
  private cachedChunks: DocumentationChunk[] | null = null;
  
  constructor() {}
  
  // Clear the store (for reindexing or purging)
  async clear(): Promise<void> {
    console.log("VectorStore: Clearing cached chunks");
    this.cachedChunks = null;
    return Promise.resolve();
  }

  // Find similar chunks to the query using enhanced cosine similarity search
  async search(query: string, topK: number = 7): Promise<SearchResult[]> {
    try {
      // Get all chunks from storage (or use cached chunks if available)
      let chunks;
      if (this.cachedChunks) {
        chunks = this.cachedChunks;
        console.log(`VectorStore.search: Using ${chunks.length} cached chunks`);
      } else {
        chunks = await storage.getAllDocumentationChunks();
        this.cachedChunks = chunks; // Cache for future queries
        console.log(`VectorStore.search: Retrieved ${chunks.length} chunks total`);
      }

      // If no chunks, return empty array
      if (chunks.length === 0) {
        console.log("VectorStore.search: No chunks found in storage");
        return [];
      }

      // Create query embedding
      console.log(`VectorStore.search: Creating embedding for query: "${query}"`);
      const queryEmbedding = await createEmbedding(query);

      // Define a minimum similarity threshold for inclusion
      // This helps filter out irrelevant chunks entirely
      const MIN_SIMILARITY_THRESHOLD = 0.65;

      // For each chunk, calculate cosine similarity
      const results: SearchResult[] = [];
      let validEmbeddingCount = 0;
      let parseErrorCount = 0;
      let emptyEmbeddingCount = 0;
      let belowThresholdCount = 0;

      for (const chunk of chunks) {
        let chunkEmbedding: number[];

        // Parse embedding from string
        try {
          chunkEmbedding = chunk.embedding ? JSON.parse(chunk.embedding) : [];
          
          // Skip if no embedding
          if (!chunkEmbedding || chunkEmbedding.length === 0) {
            emptyEmbeddingCount++;
            continue;
          }

          validEmbeddingCount++;
          
          // Calculate cosine similarity
          const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
          
          // Only include chunks that meet the minimum similarity threshold
          if (similarity >= MIN_SIMILARITY_THRESHOLD) {
            results.push({
              chunk,
              similarity
            });
          } else {
            belowThresholdCount++;
          }
        } catch (e) {
          parseErrorCount++;
          console.warn(`Failed to parse embedding for chunk ${chunk.id}`);
          continue;
        }
      }

      console.log(`VectorStore.search: Statistics - ` +
        `Valid Embeddings: ${validEmbeddingCount}, ` + 
        `Parse Errors: ${parseErrorCount}, ` +
        `Empty Embeddings: ${emptyEmbeddingCount}, ` +
        `Below Threshold: ${belowThresholdCount}`);

      // Sort by similarity (descending) and take top K
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
      
      console.log(`VectorStore.search: Found ${sortedResults.length} relevant results with similarity >= ${MIN_SIMILARITY_THRESHOLD}`);
      
      // If we have fewer than half the requested results, lower the threshold and try again
      if (sortedResults.length < Math.ceil(topK / 2) && belowThresholdCount > 0) {
        console.log("VectorStore.search: Too few results, lowering threshold and trying again");
        
        // Second pass with lower threshold
        const FALLBACK_THRESHOLD = 0.5;
        const additionalResults: SearchResult[] = [];
        
        for (const chunk of chunks) {
          try {
            const chunkEmbedding = chunk.embedding ? JSON.parse(chunk.embedding) : [];
            
            if (!chunkEmbedding || chunkEmbedding.length === 0) continue;
            
            const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
            
            // Only look at chunks that were previously below threshold but above fallback
            if (similarity >= FALLBACK_THRESHOLD && similarity < MIN_SIMILARITY_THRESHOLD) {
              additionalResults.push({
                chunk,
                similarity
              });
            }
          } catch (e) {
            continue;
          }
        }
        
        // Sort additional results and combine with existing ones
        const additionalSorted = additionalResults
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK - sortedResults.length);
          
        console.log(`VectorStore.search: Found ${additionalSorted.length} additional results with fallback threshold`);
        
        // Combine the results
        sortedResults.push(...additionalSorted);
        sortedResults.sort((a, b) => b.similarity - a.similarity);
      }
      
      return sortedResults;
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
