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
    
    // Define a renderer for the marked library to customize image rendering
    const renderer = new marked.Renderer();
    
    // Custom image renderer to handle different path formats
    renderer.image = function(href: string, title: string, text: string) {
      let imageUrl = href;
      
      // Handle the GitBook-style image paths
      if (href.includes('.gitbook/assets') || href.startsWith('../') || href.startsWith('./')) {
        // For demo purposes, we can't access these relative paths
        // In a production environment, you would map these to actual URLs
        console.log(`Replacing relative image path: ${href}`);
        imageUrl = PLACEHOLDER_IMAGE_URL;
      }
      
      // For images with http/https URLs, use them directly
      if (!(href.startsWith('http://') || href.startsWith('https://'))) {
        imageUrl = PLACEHOLDER_IMAGE_URL;
      }
      
      // Return the image tag with proper alt text and styling
      return `<img src="${imageUrl}" alt="${text || 'Image'}" title="${title || ''}" class="rounded-md max-w-full max-h-96 object-contain my-4" />`;
    };
    
    // Set marked options
    marked.setOptions({
      renderer: renderer,
      gfm: true,          // GitHub Flavored Markdown
      breaks: true,       // Convert line breaks to <br>
      headerIds: true,    // Add IDs to headers
      mangle: false       // Don't escape HTML
    });
    
    // Convert Markdown to HTML
    const rawHtml = marked(processedContent);
    
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
