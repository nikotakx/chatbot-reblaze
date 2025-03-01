import OpenAI from "openai";
import { DocumentationChunk } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-development"
});

// Initialize the context template for chat completion
const SYSTEM_PROMPT = `
You are a documentation assistant for Reblaze, a cloud-based security platform. Your goal is to provide helpful, accurate responses based ONLY on the documentation provided.
If the documentation provided doesn't contain the answer, say "I don't have information about that in the documentation." Do not make up answers.

Some documentation chunks might include references to images. When they do, include these images in your response by referring to their URLs.

Important instructions:
1. If you're not sure about an answer, focus on what you DO know from the documentation.
2. Always specify which parts of the documentation you're using in your answer.
3. For technical questions, be precise and include any relevant configuration examples from the documentation.
4. Format your responses with Markdown for readability.
5. For questions about features or functionality, explain how they work and provide context.
`;

export interface RelevantDocumentationChunk {
  chunk: DocumentationChunk;
  similarity: number;
}

export async function chatWithDocumentation(
  question: string,
  relevantDocumentation: RelevantDocumentationChunk[],
  chatHistory: { role: string; content: string }[] = []
): Promise<string> {
  // Log the number of relevant docs found for debugging
  console.log(`Found ${relevantDocumentation.length} relevant documentation chunks for query: "${question}"`);
  
  // Log similarity scores for debugging
  if (relevantDocumentation.length > 0) {
    console.log("Top document similarities:");
    relevantDocumentation.forEach((doc, index) => {
      // Safely get the path from metadata if it exists
      const metadata = doc.chunk.metadata as Record<string, any>;
      const path = metadata && metadata.path ? metadata.path : "unknown";
      console.log(`  ${index + 1}. ${path} - Score: ${doc.similarity.toFixed(4)}`);
    });
  } else {
    console.log("No relevant documentation chunks found. Check vector storage and embedding creation.");
  }
  
  // Format the documentation chunks into a single context string
  const documentationContext = relevantDocumentation
    .map((doc) => {
      const metadata = doc.chunk.metadata as Record<string, any>;
      const path = metadata && metadata.path ? metadata.path : "unknown";
      let chunkText = `From ${path}:\n${doc.chunk.content}`;
      
      // Add image information if available
      if (metadata && metadata.hasImage && metadata.imageUrl) {
        chunkText += `\n[Image: ${metadata.imageUrl}${metadata.imageAlt ? ` - ${metadata.imageAlt}` : ''}]`;
      }
      
      return chunkText;
    })
    .join("\n\n");

  // Construct the messages array with system prompt, history, and the current question with context
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory,
    {
      role: "user",
      content: `Question: ${question}\n\nRelevant documentation:\n${documentationContext}`
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: messages as any,
      temperature: 0.5,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "I couldn't generate a response.";
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return "Sorry, I encountered an error while processing your question. Please try again later.";
  }
}

// Function to create embeddings for text chunks
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error creating embedding:", error);
    // Return a dummy embedding for development purposes
    return Array(1536).fill(0).map(() => Math.random() - 0.5);
  }
}
