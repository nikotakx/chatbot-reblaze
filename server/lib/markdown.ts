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
  
  // Special case: if content is very short, just store it as a single chunk
  if (content.trim().length < 500) {
    const metadata: Record<string, any> = {
      path: file.path,
      section: "full content",
      hasImage: images && images.length > 0,
    };
    
    // Add first image if available
    if (metadata.hasImage && images && images.length > 0) {
      const primaryImage = images[0];
      metadata.imageUrl = primaryImage.url;
      metadata.imageAlt = primaryImage.alt;
    }
    
    const embeddingStr = await generateEmbeddingString(content);
    
    chunks.push({
      fileId,
      content,
      metadata,
      embedding: embeddingStr,
    });
    
    return chunks;
  }
  
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
  
  // If no chunks were created (which shouldn't happen, but just in case),
  // create a single chunk with the entire content
  if (chunks.length === 0) {
    const metadata: Record<string, any> = {
      path: file.path,
      section: "full content (fallback)",
      hasImage: images && images.length > 0,
    };
    
    if (metadata.hasImage && images && images.length > 0) {
      const primaryImage = images[0];
      metadata.imageUrl = primaryImage.url;
      metadata.imageAlt = primaryImage.alt;
    }
    
    const embeddingStr = await generateEmbeddingString(content);
    
    chunks.push({
      fileId,
      content,
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
  const lines = content.split('\n');
  const sections: Section[] = [];
  
  let currentSection: Section | null = null;
  let inCodeBlock = false;
  let inTable = false;
  let inHintBlock = false;
  let hintBlockContent = '';
  
  // Enhanced logic to handle GitBook-specific formatting
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (currentSection) {
        currentSection.content += line + '\n';
      } else {
        currentSection = {
          content: line + '\n',
        };
      }
      continue;
    }
    
    // Handle GitBook hint blocks
    if (line.includes('{% hint')) {
      inHintBlock = true;
      hintBlockContent = line + '\n';
      continue;
    }
    
    if (inHintBlock) {
      hintBlockContent += line + '\n';
      if (line.includes('{% endhint %}')) {
        inHintBlock = false;
        if (currentSection) {
          currentSection.content += hintBlockContent;
        } else {
          currentSection = {
            content: hintBlockContent,
          };
        }
      }
      continue;
    }
    
    // Handle tables
    if (line.includes('|') && (line.trim().startsWith('|') || line.trim().endsWith('|'))) {
      if (!inTable && line.includes('---')) {
        inTable = true;
      }
      
      if (currentSection) {
        currentSection.content += line + '\n';
      } else {
        currentSection = {
          content: line + '\n',
        };
      }
      continue;
    }
    
    // Reset table state if we're no longer in a table
    if (inTable && !line.includes('|')) {
      inTable = false;
    }
    
    // Don't split sections in the middle of code blocks, tables, or hint blocks
    if (inCodeBlock || inTable) {
      if (currentSection) {
        currentSection.content += line + '\n';
      } else {
        currentSection = {
          content: line + '\n',
        };
      }
      continue;
    }
    
    // Normal heading detection
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
  if (sections.length === 0) {
    return [{
      content: content
    }];
  }
  
  // Process sections based on size - using larger chunks
  const processedSections: Section[] = [];
  const MIN_SECTION_SIZE = 500; // Increased minimum characters for a section
  const MAX_SECTION_SIZE = 8000; // Increased maximum characters before splitting
  
  // First pass: group sections by top-level heading to maintain context
  let currentTopSection: Section | null = null;
  let currentTopSectionContent = "";
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Detect top-level sections (usually # or ##)
    const isTopLevel = section.level !== undefined && section.level <= 2;
    
    if (isTopLevel) {
      // If we have a previous top section, add it to processed sections
      if (currentTopSection && currentTopSectionContent.length > 0) {
        // Only split if it's very large
        if (currentTopSectionContent.length > MAX_SECTION_SIZE * 1.5) {
          const paragraphs = splitByParagraphs(currentTopSectionContent);
          for (const paragraph of paragraphs) {
            if (paragraph.length > 0) {
              processedSections.push({
                heading: currentTopSection.heading,
                level: currentTopSection.level,
                content: paragraph,
              });
            }
          }
        } else {
          processedSections.push({
            heading: currentTopSection.heading,
            level: currentTopSection.level,
            content: currentTopSectionContent,
          });
        }
      }
      
      // Start a new top section
      currentTopSection = section;
      currentTopSectionContent = section.content;
    } else {
      // This is a sub-section, add it to the current top section if we have one
      if (currentTopSection) {
        currentTopSectionContent += "\n" + section.content;
      } else {
        // No parent section, add as standalone
        processedSections.push(section);
      }
    }
  }
  
  // Add the last top section if any
  if (currentTopSection && currentTopSectionContent.length > 0) {
    if (currentTopSectionContent.length > MAX_SECTION_SIZE * 1.5) {
      const paragraphs = splitByParagraphs(currentTopSectionContent);
      for (const paragraph of paragraphs) {
        if (paragraph.length > 0) {
          processedSections.push({
            heading: currentTopSection.heading,
            level: currentTopSection.level,
            content: paragraph,
          });
        }
      }
    } else {
      processedSections.push({
        heading: currentTopSection.heading,
        level: currentTopSection.level,
        content: currentTopSectionContent,
      });
    }
  }
  
  // Second pass: combine marked sections
  const finalSections: Section[] = [];
  let currentCombinedSection: Section | null = null;
  
  for (const section of processedSections) {
    if ((section as any)._shouldCombine) {
      if (currentCombinedSection) {
        currentCombinedSection.content += '\n' + section.content;
      } else {
        currentCombinedSection = { ...section };
        delete (currentCombinedSection as any)._shouldCombine;
      }
    } else {
      if (currentCombinedSection) {
        finalSections.push(currentCombinedSection);
        currentCombinedSection = null;
      }
      finalSections.push(section);
    }
  }
  
  // Add the last combined section if any
  if (currentCombinedSection) {
    finalSections.push(currentCombinedSection);
  }
  
  return finalSections;
}

// Split content by paragraphs for large sections
function splitByParagraphs(content: string): string[] {
  // First, try to detect logical content blocks (like tables, code blocks, hint blocks)
  const specialBlocks: string[] = [];
  let remainingContent = content;
  
  // Extract GitBook hint blocks
  const hintBlockRegex = /{%\s*hint.*?%}[\s\S]*?{%\s*endhint\s*%}/g;
  remainingContent = remainingContent.replace(hintBlockRegex, (match) => {
    specialBlocks.push(match);
    return `__SPECIAL_BLOCK_${specialBlocks.length - 1}__`;
  });
  
  // Extract code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  remainingContent = remainingContent.replace(codeBlockRegex, (match) => {
    specialBlocks.push(match);
    return `__SPECIAL_BLOCK_${specialBlocks.length - 1}__`;
  });
  
  // Extract tables (simple heuristic: consecutive lines with pipe symbols)
  const tableRegex = /(\|.*\|[\r\n]+){2,}/g;
  remainingContent = remainingContent.replace(tableRegex, (match) => {
    specialBlocks.push(match);
    return `__SPECIAL_BLOCK_${specialBlocks.length - 1}__`;
  });
  
  // Split by double newlines to get logical paragraphs
  const paragraphs = remainingContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Combine paragraphs to create meaningful chunks
  const result: string[] = [];
  let currentChunk = "";
  const MIN_CHUNK_SIZE = 250; // Increased minimum characters for a standalone chunk
  const MAX_CHUNK_SIZE = 8000; // Increased maximum characters for a chunk
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    // If paragraph contains a special block reference, restore it
    let processedParagraph = trimmedParagraph.replace(/__SPECIAL_BLOCK_(\d+)__/g, (_, index) => {
      return specialBlocks[parseInt(index, 10)];
    });
    
    // Special case: if a restored paragraph is now very large, add it as a standalone chunk
    if (processedParagraph.length > MAX_CHUNK_SIZE) {
      // If we have a current chunk, add it first
      if (currentChunk) {
        result.push(currentChunk);
        currentChunk = "";
      }
      // Add the large paragraph as its own chunk
      result.push(processedParagraph);
      continue;
    }
    
    // If adding this paragraph would make the chunk too large, start a new chunk
    if (currentChunk && (currentChunk.length + processedParagraph.length > MAX_CHUNK_SIZE)) {
      result.push(currentChunk);
      currentChunk = processedParagraph;
    } else {
      // Add a space between paragraphs in the same chunk
      if (currentChunk) {
        currentChunk += "\n\n" + processedParagraph;
      } else {
        currentChunk = processedParagraph;
      }
    }
  }
  
  // Add the last chunk if it exists
  if (currentChunk) {
    result.push(currentChunk);
  }
  
  // If we have no results but had content, return the original content
  if (result.length === 0 && content.trim().length > 0) {
    return [content];
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
