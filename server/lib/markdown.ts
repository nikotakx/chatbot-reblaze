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
  if (content.trim().length < 800) {
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
  
  // Process sections based on size - using larger chunks with improved context
  const processedSections: Section[] = [];
  
  // Enhanced parameters for section processing
  const MIN_SECTION_SIZE = 1000; // Increased minimum characters for a section
  const MAX_SECTION_SIZE = 12000; // Increased maximum characters before splitting
  const MIN_PARAGRAPHS_IN_SECTION = 2; // Ensure at least two paragraphs per section when possible
  
  // First pass: group sections by top-level heading to maintain better context
  let currentTopSection: Section | null = null;
  let currentTopSectionContent = "";
  let paragraphsInCurrentSection = 0;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Detect top-level sections (usually # or ##)
    const isTopLevel = section.level !== undefined && section.level <= 2;
    
    if (isTopLevel) {
      // If we have a previous top section, process it
      if (currentTopSection && currentTopSectionContent.length > 0) {
        // Check paragraph count in current section
        const paragraphCount = currentTopSectionContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
        
        // Only split if it's extremely large or has many paragraphs (which provides enough context)
        if (currentTopSectionContent.length > MAX_SECTION_SIZE || paragraphCount > 10) {
          // Use our enhanced paragraph splitting function to maintain context
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
          // Keep the section intact to maintain better context
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
      paragraphsInCurrentSection = currentTopSectionContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    } else {
      // This is a sub-section, add it to the current top section if we have one
      if (currentTopSection) {
        const contentToAdd = "\n" + section.content;
        const additionalParagraphs = contentToAdd.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
        
        // Always add if we don't have minimum paragraphs yet or section is small enough
        if (
          paragraphsInCurrentSection < MIN_PARAGRAPHS_IN_SECTION || 
          currentTopSectionContent.length + contentToAdd.length <= MAX_SECTION_SIZE
        ) {
          currentTopSectionContent += contentToAdd;
          paragraphsInCurrentSection += additionalParagraphs;
        } 
        // If adding would make the section too large, process current and start a new one
        else if (currentTopSectionContent.length + contentToAdd.length > MAX_SECTION_SIZE) {
          // Process current section
          processedSections.push({
            heading: currentTopSection.heading,
            level: currentTopSection.level,
            content: currentTopSectionContent,
          });
          
          // Start a new section with the same heading but new content
          currentTopSectionContent = section.content;
          paragraphsInCurrentSection = currentTopSectionContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
        }
      } else {
        // No parent section, check if this is a substantial subsection
        const contentLength = section.content.length;
        const paragraphCount = section.content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
        
        // Ensure it has enough content or paragraphs
        if (contentLength >= MIN_SECTION_SIZE || paragraphCount >= MIN_PARAGRAPHS_IN_SECTION) {
          processedSections.push(section);
        } else {
          // For small subsections without parent, mark for potential combining later
          (section as any)._shouldCombine = true;
          processedSections.push(section);
        }
      }
    }
  }
  
  // Add the last top section if any
  if (currentTopSection && currentTopSectionContent.length > 0) {
    const paragraphCount = currentTopSectionContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    
    // Only split if it's extremely large
    if (currentTopSectionContent.length > MAX_SECTION_SIZE || paragraphCount > 10) {
      // Use our enhanced paragraph splitting function to maintain context
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
      // Keep the section intact for better context
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
  
  // ENHANCED PARAMETERS:
  // Increased minimum characters for a chunk to encourage grouping more paragraphs
  const MIN_CHUNK_SIZE = 800; 
  // Minimum paragraphs per chunk - ensure at least two paragraphs per chunk when possible
  const MIN_PARAGRAPHS_PER_CHUNK = 2;
  // Increased maximum characters for a chunk
  const MAX_CHUNK_SIZE = 14000; 
  
  // Track paragraph count in current chunk
  let paragraphsInCurrentChunk = 0;
  
  // First pass: group paragraphs into chunks based on size and min paragraph count
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const trimmedParagraph = paragraph.trim();
    
    // If paragraph contains a special block reference, restore it
    let processedParagraph = trimmedParagraph.replace(/__SPECIAL_BLOCK_(\d+)__/g, (_, index) => {
      return specialBlocks[parseInt(index, 10)];
    });
    
    // Special case: if a restored paragraph is very large, handle it separately
    if (processedParagraph.length > MAX_CHUNK_SIZE) {
      // If we have a current chunk with content, add it first
      if (currentChunk) {
        result.push(currentChunk);
        currentChunk = "";
        paragraphsInCurrentChunk = 0;
      }
      // Add the large paragraph as its own chunk
      result.push(processedParagraph);
      continue;
    }
    
    // Normal paragraph handling with minimum paragraph count consideration
    if (
      !currentChunk || 
      (
        // If adding would keep us under max size AND
        (currentChunk.length + processedParagraph.length <= MAX_CHUNK_SIZE) && 
        // Either we don't have minimum paragraphs yet OR the chunk is still small
        (paragraphsInCurrentChunk < MIN_PARAGRAPHS_PER_CHUNK || currentChunk.length < MIN_CHUNK_SIZE)
      )
    ) {
      // Add to current chunk
      if (currentChunk) {
        currentChunk += "\n\n" + processedParagraph;
      } else {
        currentChunk = processedParagraph;
      }
      paragraphsInCurrentChunk++;
      
      // If we're at the last paragraph, add the current chunk to result
      if (i === paragraphs.length - 1 && currentChunk) {
        result.push(currentChunk);
      }
    } else {
      // Current chunk meets our criteria, add it and start a new one
      result.push(currentChunk);
      currentChunk = processedParagraph;
      paragraphsInCurrentChunk = 1;
      
      // If we're at the last paragraph, add this new chunk as well
      if (i === paragraphs.length - 1) {
        result.push(currentChunk);
      }
    }
  }
  
  // Second pass: ensure minimum chunk size by merging small chunks
  if (result.length > 1) {
    const mergedResult: string[] = [];
    let mergedChunk = "";
    let mergedParagraphCount = 0;
    
    for (let i = 0; i < result.length; i++) {
      const chunk = result[i];
      const chunkParagraphCount = chunk.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
      
      // If this chunk is too small or doesn't have enough paragraphs
      const isTooSmall = chunk.length < MIN_CHUNK_SIZE || chunkParagraphCount < MIN_PARAGRAPHS_PER_CHUNK;
      
      if (isTooSmall && mergedChunk && (mergedChunk.length + chunk.length <= MAX_CHUNK_SIZE)) {
        // Merge with the previous chunk
        mergedChunk += "\n\n" + chunk;
        mergedParagraphCount += chunkParagraphCount;
      } 
      // If this chunk is too small but we don't have a previous chunk to merge with
      else if (isTooSmall && !mergedChunk && i < result.length - 1) {
        // Start a new merged chunk with this small one
        mergedChunk = chunk;
        mergedParagraphCount = chunkParagraphCount;
      }
      // If this is a large enough chunk or we can't merge anymore
      else {
        // If we have a merged chunk, add it first
        if (mergedChunk) {
          mergedResult.push(mergedChunk);
          mergedChunk = "";
          mergedParagraphCount = 0;
        }
        
        // Whether to start a new merged chunk or add as-is depends on size
        if (isTooSmall) {
          mergedChunk = chunk;
          mergedParagraphCount = chunkParagraphCount;
        } else {
          mergedResult.push(chunk);
        }
      }
    }
    
    // Add the last merged chunk if any
    if (mergedChunk) {
      mergedResult.push(mergedChunk);
    }
    
    // If we successfully merged chunks, return that result
    if (mergedResult.length > 0) {
      return mergedResult;
    }
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
