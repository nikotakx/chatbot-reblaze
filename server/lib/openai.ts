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

IMPORTANT: The documentation is provided as chunks from markdown files. Each chunk will be labeled with its source file path.
- These chunks may contain full sections of documentation INCLUDING the section headings
- Some chunks will start with markdown headings (e.g. "# Dynamic Rules") - these are ACTUAL CONTENT, not just labels
- Read ALL the content provided in these chunks, including headings and code examples
- Each chunk contains at least two paragraphs when possible to provide better context

If the provided documentation chunks contain the heading or section names that match the query but no detailed content, say "I found information about [topic] but the documentation doesn't provide detailed information about it."

If the documentation provided doesn't contain the answer at all, say "I don't have information about that in the documentation." Do not make up answers.

Some documentation chunks might include references to images. When they do, include these images in your response by referring to their URLs.

Important instructions:
1. If you're not sure about an answer, focus on what you DO know from the documentation.
2. Always specify which parts of the documentation you're using in your answer.
3. For technical questions, be precise and include any relevant configuration examples from the documentation.
4. Format your responses with Markdown for readability.
5. For questions about features or functionality, explain how they work and provide context.
6. Mention the specific filename (without the full path) where you found the information.
7. Use the multi-paragraph context provided in each chunk to give more complete answers.
8. If related information appears across different chunks, synthesize it into a coherent answer.
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
      
      // Log the first 100 chars of content for debugging
      const previewContent = doc.chunk.content.substring(0, 100).replace(/\n/g, ' ') + '...';
      console.log(`     Preview: ${previewContent}`);
    });
  } else {
    console.log("No relevant documentation chunks found. Check vector storage and embedding creation.");
  }
  
  // Format the documentation chunks into a single context string with clear sections
  const documentationContext = relevantDocumentation
    .map((doc, index) => {
      const metadata = doc.chunk.metadata as Record<string, any>;
      const path = metadata && metadata.path ? metadata.path : "unknown";
      
      // Get the filename without the path for cleaner reference
      const filename = path.split('/').pop() || path;
      
      // Create a clearly marked section with the document source
      let chunkText = `--- DOCUMENT ${index + 1}: ${filename} ---\n${doc.chunk.content}`;
      
      // Add image information if available
      if (metadata && metadata.hasImage && metadata.imageUrl) {
        chunkText += `\n[Image: ${metadata.imageUrl}${metadata.imageAlt ? ` - ${metadata.imageAlt}` : ''}]`;
      }
      
      return chunkText;
    })
    .join("\n\n");

  // Log the full context length for debugging
  console.log(`Documentation context length: ${documentationContext.length} characters`);
  
  // Construct the messages array with system prompt, history, and the current question with context
  const userMessage = `
Question: ${question}

I've found the following relevant documentation that should help answer your question:

${documentationContext}

IMPORTANT REMINDER:
1. The sections above contain ACTUAL documentation content, including headings.
2. If you see a heading like "# Dynamic Rules", this is the TITLE of the section about that topic.
3. Please use ALL information from these sections to answer the question.
4. If the sections contain only headings without detailed content, say "I found references to [topic] but no detailed explanation in the documentation."

Please answer the question based ONLY on this documentation. If the documentation does NOT contain enough information to answer the question fully, acknowledge these limitations.
`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory,
    { role: "user", content: userMessage }
  ];

  try {
    // Log the full system prompt and first part of user message for debugging
    console.log(`OpenAI System Prompt (${SYSTEM_PROMPT.length} chars): ${SYSTEM_PROMPT.substring(0, 100)}...`);
    console.log(`OpenAI User Message Preview (first 200 chars): ${userMessage.substring(0, 200)}...`);
    
    // Call OpenAI API with enhanced parameters
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: messages as any,
      temperature: 0.4, // Slightly reduced temperature for more focused responses
      max_tokens: 1500, // Increased token limit for more comprehensive answers
      presence_penalty: 0.1, // Slight penalty to prevent repetition
      frequency_penalty: 0.1, // Slight penalty to encourage diverse language
    });

    // Log the response for debugging
    const responseContent = response.choices[0].message.content || "I couldn't generate a response.";
    console.log(`OpenAI Response Preview (first 100 chars): ${responseContent.substring(0, 100)}...`);
    
    return responseContent;
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
