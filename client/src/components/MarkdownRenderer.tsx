import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Proxy or placeholder image URL to use when relative GitBook paths can't be resolved
 */
const PLACEHOLDER_IMAGE_URL = "https://via.placeholder.com/400x300?text=Image+Not+Available";

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [html, setHtml] = useState<string>("");
  
  useEffect(() => {
    const renderMarkdown = () => {
      if (!content) {
        setHtml("");
        return;
      }
      
      try {
        // First preprocess the markdown to handle relative image paths
        let processedContent = content;
        
        // Replace any image markdown syntax with relative URLs to use our placeholder
        processedContent = processedContent.replace(
          /!\[(.*?)\]\((?!http[s]?:\/\/)([^)]*)\)/g,
          `![Document Image](${PLACEHOLDER_IMAGE_URL})`
        );
        
        // Configure marked with options
        marked.setOptions({
          breaks: true,
          gfm: true
        });
        
        // Parse markdown to HTML
        const rawHtml = marked.parse(processedContent);
        
        // Make sure we have a string
        if (typeof rawHtml !== 'string') {
          console.error("marked.parse did not return a string");
          setHtml("<p>Error rendering content</p>");
          return;
        }
        
        // Process the HTML to handle image tags and styles
        let processedHtml = rawHtml.replace(
          /<img[^>]*src=["'](?!http[s]?:\/\/)([^"']*)["'][^>]*>/gi,
          `<img src="${PLACEHOLDER_IMAGE_URL}" alt="Documentation Image" class="rounded-md max-w-full my-4" />`
        );
        
        // Make sure Google Drive images render correctly
        processedHtml = processedHtml.replace(
          /<img[^>]*src=["'](https?:\/\/lh[0-9]\.googleusercontent\.com\/[^"']*)["'][^>]*>/gi,
          `<img src="$1" alt="Documentation Image" class="rounded-md max-w-full my-4" />`
        );
        
        // Add styling to tables
        processedHtml = processedHtml.replace(
          /<table>/g,
          '<table class="border-collapse border border-gray-300 my-4 w-full">'
        );
        
        processedHtml = processedHtml.replace(
          /<th>/g,
          '<th class="border border-gray-300 px-3 py-2 bg-gray-100">'
        );
        
        processedHtml = processedHtml.replace(
          /<td>/g,
          '<td class="border border-gray-300 px-3 py-2">'
        );
        
        // Configure DOMPurify to allow all the HTML tags we need
        const purifyConfig = {
          ADD_TAGS: ['img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
          ADD_ATTR: ['src', 'alt', 'title', 'class', 'href', 'target', 'rel']
        };
        
        // Sanitize HTML
        const sanitizedHtml = DOMPurify.sanitize(processedHtml, purifyConfig) as string;
        setHtml(sanitizedHtml);
      } catch (err) {
        // Handle error with proper TypeScript type assertion
        const error = err as Error;
        console.error("Error processing markdown:", error);
        setHtml(`<p>Error rendering content: ${error.message}</p>`);
      }
    };
    
    renderMarkdown();
  }, [content]);

  // Add some custom styling for the markdown content
  return (
    <div 
      className="markdown-content prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
