import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

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
    if (!content) {
      setHtml("");
      return;
    }
    
    try {
      // Instead of relying on marked.js which has issues with some image tags,
      // we'll just handle the HTML/Markdown formatting ourselves with a two-step process:
      
      // 1. First replace any HTML image tags that don't use http/https with our placeholder
      let processedHtml = content.replace(
        /<img[^>]*src=["'](?!http[s]?:\/\/)([^"']*)["'][^>]*>/gi,
        `<img src="${PLACEHOLDER_IMAGE_URL}" alt="Documentation Image" class="rounded-md max-w-full my-4" />`
      );
      
      // 2. Also replace any HTML image tags with Google Drive URLs (lh*.googleusercontent.com)
      // These are absolute URLs but we still want to render them properly
      processedHtml = processedHtml.replace(
        /<img[^>]*src=["'](https?:\/\/lh[0-9]\.googleusercontent\.com\/[^"']*)["'][^>]*>/gi,
        `<img src="$1" alt="Documentation Image" class="rounded-md max-w-full my-4" />`
      );
      
      // 3. Also handle normal Markdown image syntax
      processedHtml = processedHtml.replace(
        /!\[(.*?)\]\((?!http[s]?:\/\/)([^)]*)\)/g,
        `![Document Image](${PLACEHOLDER_IMAGE_URL})`
      );
      
      // 4. Keep Markdown image syntax for http/https URLs
      processedHtml = processedHtml.replace(
        /!\[(.*?)\]\((https?:\/\/[^)]*)\)/g,
        `<img src="$2" alt="$1" class="rounded-md max-w-full my-4" />`
      );
      
      // 5. Add basic Markdown paragraph formatting
      processedHtml = processedHtml.replace(/\n\n/g, '</p><p>');
      processedHtml = `<p>${processedHtml}</p>`;
      
      // 6. Configure DOMPurify to allow img tags
      const purifyConfig = {
        ADD_TAGS: ['img'],
        ADD_ATTR: ['src', 'alt', 'title', 'class']
      };
      
      // 7. Sanitize HTML - DOMPurify returns a string in browser environments
      const sanitizedHtml = DOMPurify.sanitize(processedHtml, purifyConfig) as string;
      setHtml(sanitizedHtml);
    } catch (err) {
      // Handle error with proper TypeScript type assertion
      const error = err as Error;
      console.error("Error processing markdown:", error);
      setHtml(`<p>Error rendering content: ${error.message}</p>`);
    }
  }, [content]);

  // Add some custom styling for the markdown content
  return (
    <div 
      className="markdown-content prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
