import { InsertDocumentationFile, InsertDocumentationImage } from "@shared/schema";
import fetch from "node-fetch";

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content?: string;
  encoding?: string;
}

interface GitHubApiError {
  message: string;
  documentation_url: string;
}

export interface GitHubRepoContent {
  files: InsertDocumentationFile[];
  images: InsertDocumentationImage[];
}

export async function fetchRepositoryFiles(
  repoUrl: string,
  branch: string = "main"
): Promise<GitHubRepoContent> {
  // Extract owner and repo from URL
  const urlParts = repoUrl.replace(/\.git$/, "").split("/");
  const owner = urlParts[urlParts.length - 2];
  const repo = urlParts[urlParts.length - 1];

  if (!owner || !repo) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  // Add authentication if GitHub token is provided
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    // Fetch repository file tree
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      const error: GitHubApiError = await response.json() as GitHubApiError;
      throw new Error(`GitHub API Error: ${error.message}`);
    }

    const data = await response.json() as { tree: { path: string; type: string; url: string; }[] };
    
    // Filter only Markdown files and extract their paths
    const markdownFiles = data.tree.filter(item => item.path.endsWith('.md') && item.type === 'blob');
    
    const files: InsertDocumentationFile[] = [];
    const images: InsertDocumentationImage[] = [];
    
    // Fetch content for each Markdown file
    for (const file of markdownFiles) {
      const fileContent = await fetchFileContent(owner, repo, branch, file.path);
      
      // Extract image references from Markdown content
      const imageRefs = extractImageReferences(fileContent, file.path);
      
      // Prepare the documentation file
      const docFile: InsertDocumentationFile = {
        path: file.path,
        content: fileContent,
        hasImages: imageRefs.length > 0,
        githubUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${file.path}`
      };
      
      files.push(docFile);
      
      // Add images if found
      imageRefs.forEach(img => {
        // For demo purposes, we're treating image URLs as-is
        // In a real implementation, you'd need to handle relative paths and GitHub asset URLs
        images.push({
          fileId: 0, // This will be replaced with the actual file ID when saving
          path: file.path,
          url: img.url,
          alt: img.alt
        });
      });
    }

    return { files, images };
  } catch (error) {
    console.error("Error fetching repository files:", error);
    throw error;
  }
}

async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      const error: GitHubApiError = await response.json() as GitHubApiError;
      throw new Error(`GitHub API Error: ${error.message}`);
    }

    const data = await response.json() as GitHubFile;
    
    // GitHub API returns content as base64 encoded
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf8');
    }
    
    throw new Error('File content is not available');
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error);
    throw error;
  }
}

interface ImageReference {
  url: string;
  alt: string;
}

// Simple function to extract Markdown image references
function extractImageReferences(content: string, filePath: string): ImageReference[] {
  const imageRefs: ImageReference[] = [];
  const regex = /!\[(.*?)\]\((.*?)\)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const alt = match[1];
    const url = match[2];
    
    // Skip SVG and other inline images
    if (!url.startsWith('data:')) {
      imageRefs.push({ url, alt });
    }
  }
  
  return imageRefs;
}
