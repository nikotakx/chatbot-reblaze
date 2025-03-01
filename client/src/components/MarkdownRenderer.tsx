import { useEffect, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Proxy or placeholder image URL to use when relative GitBook paths can't be resolved
 */
const PLACEHOLDER_IMAGE_URL = "https://via.placeholder.com/400x300?text=Image+Not+Available";

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [html, setHtml] = useState("");
  
  useEffect(() => {
    // Process the content to fix image paths and references
    let processedContent = content;
    
    // Use a simpler approach - preprocess the Markdown to replace relative image paths
    // Find all markdown image references ![alt](path) and adjust the paths
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    processedContent = processedContent.replace(imgRegex, (match, alt, path) => {
      // Skip if it's already an absolute URL
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return match;
      }
      
      // Replace relative paths with placeholder
      if (path.includes('.gitbook/assets') || path.startsWith('../') || path.startsWith('./')) {
        return `![${alt}](${PLACEHOLDER_IMAGE_URL})`;
      }
      
      // Default case - use placeholder for all other non-absolute URLs
      return `![${alt}](${PLACEHOLDER_IMAGE_URL})`;
    });
    
    // Convert the processed Markdown to HTML
    const rawHtml = marked.parse(processedContent);
    
    // Sanitize HTML
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    setHtml(sanitizedHtml);
  }, [content]);

  // Add some custom styling for the markdown content
  return (
    <div 
      className="markdown-content prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
