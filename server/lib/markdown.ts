import { InsertDocumentationChunk, InsertDocumentationFile, DocumentationImage } from "@shared/schema";
import { createEmbedding } from "./openai";

// Function to chunk Markdown content into paragraphs
export async function processMarkdownForVectorStorage(
  file: InsertDocumentationFile | { id: number, path: string, content: string },
  fileId: number,
  images?: DocumentationImage[]
): Promise<InsertDocumentationChunk[]> {
  const content = file.content;
  const chunks: InsertDocumentationChunk[] = [];
  
  // Split content by headers and paragraphs
  const sections = splitIntoSections(content);
  
  for (const section of sections) {
    // Skip empty sections
    if (section.content.trim() === "") {
      continue;
    }
    
    // Check if section contains an image reference
    const imageRefs = images?.filter(img => {
      return section.content.includes(img.url) || 
             (img.alt && section.content.includes(img.alt));
    });
    
    // Create metadata based on section properties
    const metadata: Record<string, any> = {
      path: file.path,
      section: section.heading || "content",
      hasImage: imageRefs && imageRefs.length > 0,
    };
    
    // Add image information if available
    if (metadata.hasImage && imageRefs) {
      const primaryImage = imageRefs[0];
      metadata.imageUrl = primaryImage.url;
      metadata.imageAlt = primaryImage.alt;
    }
    
    // Create embedding string for the chunk
    const embeddingStr = await generateEmbeddingString(section.content);
    
    // Create the chunk
    chunks.push({
      fileId,
      content: section.content,
      metadata,
      embedding: embeddingStr,
    });
  }
  
  return chunks;
}

interface Section {
  heading?: string;
  level?: number;
  content: string;
}

// Split Markdown content into logical sections based on headings
function splitIntoSections(content: string): Section[] {
  // Special case: if the entire content is very short, just return it as one section
  if (content.length < 1000) {
    return [{
      content: content
    }];
  }

  const lines = content.split('\n');
  const sections: Section[] = [];
  
  let currentSection: Section | null = null;
  
  // Enhanced logic to ensure section content includes both heading and content
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      // If we find a heading, save the previous section and start a new one
      if (currentSection && currentSection.content.trim().length > 0) {
        sections.push(currentSection);
      }
      
      // Create a new section that includes the heading
      currentSection = {
        heading: headingMatch[2],
        level: headingMatch[1].length,
        content: line + '\n', // Include the heading in the content
      };
    } else if (currentSection) {
      // Add line to current section
      currentSection.content += line + '\n';
    } else {
      // If no current section, create one without a heading
      currentSection = {
        content: line + '\n',
      };
    }
  }
  
  // Add the last section
  if (currentSection && currentSection.content.trim().length > 0) {
    sections.push(currentSection);
  }
  
  // If no meaningful sections were created, use the entire content
  if (sections.length === 0 || (sections.length === 1 && sections[0].content.trim().length < 100)) {
    return [{
      content: content
    }];
  }
  
  // If sections are too large, split them by paragraphs
  // Or if they are too small, merge with adjacent sections
  const finalSections: Section[] = [];
  const MIN_SECTION_SIZE = 150; // Minimum characters for a section to be considered meaningful
  const MAX_SECTION_SIZE = 1500; // Maximum characters for a section before splitting
  
  // First pass: split large sections
  for (const section of sections) {
    if (section.content.length > MAX_SECTION_SIZE) {
      const paragraphs = splitByParagraphs(section.content);
      for (const paragraph of paragraphs) {
        if (paragraph.length > 0) {
          finalSections.push({
            heading: section.heading,
            level: section.level,
            content: paragraph,
          });
        }
      }
    } else {
      finalSections.push(section);
    }
  }
  
  // Second pass: merge small sections with related content
  const mergedSections: Section[] = [];
  let currentMergedSection: Section | null = null;
  
  for (const section of finalSections) {
    // If this is a heading section and it's small
    if (section.heading && section.content.length < MIN_SECTION_SIZE) {
      // If we already have a section to merge with
      if (currentMergedSection && currentMergedSection.heading === section.heading) {
        // Merge with the existing section if it has the same heading
        currentMergedSection.content += '\n\n' + section.content;
      } else {
        // Start a new merged section
        if (currentMergedSection) {
          mergedSections.push(currentMergedSection);
        }
        currentMergedSection = { ...section };
      }
    } else {
      // For larger sections or different headings, add as-is
      if (currentMergedSection) {
        mergedSections.push(currentMergedSection);
        currentMergedSection = null;
      }
      mergedSections.push(section);
    }
  }
  
  // Add the last merged section
  if (currentMergedSection) {
    mergedSections.push(currentMergedSection);
  }
  
  return mergedSections;
}

// Split content by paragraphs for large sections
function splitByParagraphs(content: string): string[] {
  // Split by double newlines to get paragraphs, with a minimum paragraph size
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Combine paragraphs that are too small to create meaningful chunks
  const result: string[] = [];
  let currentChunk = "";
  const MIN_CHUNK_SIZE = 100; // Minimum characters for a standalone chunk
  const MAX_CHUNK_SIZE = 1500; // Maximum characters for a chunk to prevent too large chunks
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    // If adding this paragraph would make the chunk too large, start a new chunk
    if (currentChunk && (currentChunk.length + trimmedParagraph.length > MAX_CHUNK_SIZE)) {
      result.push(currentChunk);
      currentChunk = trimmedParagraph;
    } else {
      // Add a space between paragraphs in the same chunk
      if (currentChunk) {
        currentChunk += "\n\n" + trimmedParagraph;
      } else {
        currentChunk = trimmedParagraph;
      }
    }
  }
  
  // Add the last chunk if it exists and has meaningful content
  if (currentChunk && currentChunk.length >= MIN_CHUNK_SIZE) {
    result.push(currentChunk);
  } else if (currentChunk) {
    // If the last chunk is too small, try to merge it with the previous chunk or just keep it
    if (result.length > 0) {
      const lastIndex = result.length - 1;
      const lastChunk = result[lastIndex];
      if (lastChunk.length + currentChunk.length <= MAX_CHUNK_SIZE) {
        result[lastIndex] = lastChunk + "\n\n" + currentChunk;
      } else {
        result.push(currentChunk);
      }
    } else {
      result.push(currentChunk);
    }
  }
  
  return result;
}

// Generate embedding string for the chunk content
async function generateEmbeddingString(content: string): Promise<string> {
  try {
    const embedding = await createEmbedding(content);
    return JSON.stringify(embedding);
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return empty string in case of error
    return "";
  }
}
