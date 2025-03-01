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
  // Handle different GitHub URL formats
  const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(githubRegex);
  
  if (!match || match.length < 3) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}. Expected format: https://github.com/owner/repo`);
  }
  
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  
  console.log(`Parsed GitHub URL: Owner=${owner}, Repo=${repo}`);
  
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  // Instead of using the git/trees endpoint, use the contents endpoint to get all files
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;
  
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

    const data = await response.json() as GitHubFile[];
    
    // First, get all the files in the top-level directory
    const allFiles: GitHubFile[] = [];
    
    // Process initial directory
    for (const item of data) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        allFiles.push(item);
      } else if (item.type === 'dir') {
        // Fetch subdirectory contents recursively
        await processDirectory(owner, repo, branch, item.path, allFiles);
      }
    }
    
    console.log(`Found ${allFiles.length} Markdown files in repository`);
    
    // Filter only Markdown files
    const markdownFiles = allFiles;
    
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

// Process subdirectories recursively
async function processDirectory(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  allFiles: GitHubFile[]
): Promise<void> {
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

    const data = await response.json() as GitHubFile[];
    
    for (const item of data) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        allFiles.push(item);
      } else if (item.type === 'dir') {
        // Recursively process subdirectories
        await processDirectory(owner, repo, branch, item.path, allFiles);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${path}:`, error);
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
