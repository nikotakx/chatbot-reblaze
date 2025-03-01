import { useEffect, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [html, setHtml] = useState("");
  const [imageReferences, setImageReferences] = useState<Array<{ url: string; alt: string }>>([]);

  useEffect(() => {
    // Process the content to extract image references
    const imgRegex = /\[Image: (https?:\/\/[^\s]+)( - (.+?))?\]/g;
    let match;
    const images = [];
    let processedContent = content;
    
    while ((match = imgRegex.exec(content)) !== null) {
      const url = match[1];
      const alt = match[3] || "";
      
      images.push({ url, alt });
      
      // Replace the reference with actual markdown image syntax
      processedContent = processedContent.replace(
        match[0],
        `![${alt}](${url})`
      );
    }
    
    setImageReferences(images);
    
    // Convert Markdown to HTML
    const rawHtml = marked(processedContent);
    // Sanitize HTML
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    setHtml(sanitizedHtml);
  }, [content]);

  // Handle rendering the content with images
  return (
    <div 
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
