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
  branch: string = "master"
): Promise<GitHubRepoContent> {
  // Extract owner and repo from URL
  // Handle different GitHub URL formats
  const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(githubRegex);
  
  let owner: string;
  let repo: string;
  
  if (match && match.length >= 3) {
    owner = match[1];
    repo = match[2].replace(/\.git$/, "");
  } else {
    // Try alternate format (owner/repo directly)
    const parts = repoUrl.split('/');
    if (parts.length >= 2) {
      owner = parts[0];
      repo = parts[1].replace(/\.git$/, "");
    } else {
      throw new Error(`Invalid GitHub URL: ${repoUrl}. Expected format: https://github.com/owner/repo or owner/repo`);
    }
  }
  
  console.log(`Parsed GitHub URL: Owner=${owner}, Repo=${repo}, Branch=${branch}`);
  
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  // First check available branches
  const branchesUrl = `https://api.github.com/repos/${owner}/${repo}/branches`;
  console.log(`Checking available branches: ${branchesUrl}`);
  
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  // Add authentication if GitHub token is provided
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }
  
  try {
    // Check available branches first
    const branchesResponse = await fetch(branchesUrl, { headers });
    
    if (!branchesResponse.ok) {
      const error: GitHubApiError = await branchesResponse.json() as GitHubApiError;
      throw new Error(`GitHub API Error: ${error.message}`);
    }
    
    const branches = await branchesResponse.json() as {name: string}[];
    const branchNames = branches.map(b => b.name);
    console.log(`Available branches: ${branchNames.join(', ')}`);
    
    // Check if specified branch exists
    if (!branchNames.includes(branch)) {
      console.log(`Branch '${branch}' not found.`);
      
      // Try some common branch names
      if (branch !== 'master' && branchNames.includes('master')) {
        console.log(`Using 'master' branch instead.`);
        branch = 'master';
      } else if (branch !== 'main' && branchNames.includes('main')) {
        console.log(`Using 'main' branch instead.`);
        branch = 'main';
      } else if (branch !== 'v2.x' && branchNames.includes('v2.x')) {
        console.log(`Using 'v2.x' branch instead.`);
        branch = 'v2.x';
      } else if (branchNames.length > 0) {
        // Use first available branch
        console.log(`Using first available branch: ${branchNames[0]}`);
        branch = branchNames[0];
      } else {
        throw new Error(`No valid branches found in repository.`);
      }
    }
    
    // Now fetch repository contents
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;
    console.log(`Fetching repository contents from: ${apiUrl}`);
    
    // Fetch repository file tree
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      const error: GitHubApiError = await response.json() as GitHubApiError;
      throw new Error(`GitHub API Error: ${error.message}`);
    }

    console.log(`GitHub API response status: ${response.status}`);
    
    const data = await response.json() as GitHubFile[];
    console.log(`Fetched ${data.length} items from the top-level directory`);
    
    // First, get all the files in the top-level directory
    const allFiles: GitHubFile[] = [];
    
    // Process initial directory
    for (const item of data) {
      console.log(`Processing: ${item.name}, type: ${item.type}`);
      if (item.type === 'file' && item.name.endsWith('.md')) {
        console.log(`Added markdown file: ${item.path}`);
        allFiles.push(item);
      } else if (item.type === 'dir') {
        console.log(`Processing directory: ${item.path}`);
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
  console.log(`Fetching file content from: ${apiUrl}`);
  
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(apiUrl, { headers });
    console.log(`File content response status: ${response.status} for ${path}`);
    
    if (!response.ok) {
      const error: GitHubApiError = await response.json() as GitHubApiError;
      throw new Error(`GitHub API Error: ${error.message}`);
    }

    const data = await response.json() as GitHubFile;
    
    // GitHub API returns content as base64 encoded
    if (data.content && data.encoding === 'base64') {
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      // Log a preview of the content
      console.log(`Content preview for ${path}: ${content.substring(0, 100)}...`);
      return content;
    }
    
    console.error(`Content is not available for ${path}: `, data);
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
  console.log(`Processing directory at: ${apiUrl}`);
  
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(apiUrl, { headers });
    console.log(`Directory response status: ${response.status} for ${path}`);
    
    if (!response.ok) {
      const error: GitHubApiError = await response.json() as GitHubApiError;
      throw new Error(`GitHub API Error: ${error.message}`);
    }

    const data = await response.json() as GitHubFile[];
    console.log(`Directory ${path} contains ${data.length} items`);
    
    for (const item of data) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        console.log(`Found markdown file in directory: ${item.path}`);
        allFiles.push(item);
      } else if (item.type === 'dir') {
        console.log(`Found subdirectory: ${item.path}`);
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
