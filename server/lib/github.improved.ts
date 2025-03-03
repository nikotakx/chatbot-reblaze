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

/**
 * Creates headers for GitHub API requests with authentication if available
 */
function createGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Documentation-Chatbot/1.0"
  };
  
  if (process.env.GITHUB_TOKEN) {
    console.log("Using authenticated GitHub API requests");
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  } else {
    console.warn("No GITHUB_TOKEN found. API requests will be rate-limited.");
  }
  
  return headers;
}

/**
 * Handle GitHub API response errors, including rate limiting
 */
async function handleGitHubApiError(response: any): Promise<never> {
  // Check for rate limiting
  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  const rateLimitReset = response.headers.get('x-ratelimit-reset');
  
  if (rateLimitRemaining === '0') {
    const resetDate = new Date(parseInt(rateLimitReset || '0') * 1000);
    throw new Error(`GitHub API rate limit exceeded. Limit resets at ${resetDate.toLocaleString()}`);
  }
  
  // Handle other errors
  try {
    const error: GitHubApiError = await response.json() as GitHubApiError;
    throw new Error(`GitHub API Error: ${error.message}`);
  } catch (e) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }
}

/**
 * Parse GitHub URL to extract owner and repo
 */
function parseGitHubUrl(repoUrl: string): { owner: string, repo: string } {
  // Handle different GitHub URL formats
  const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(githubRegex);
  
  let owner: string | undefined;
  let repo: string | undefined;
  
  if (match && match.length >= 3) {
    owner = match[1];
    repo = match[2].replace(/\.git$/, "").replace(/\/$/, "");
  } else {
    // Try alternate format (owner/repo directly)
    const parts = repoUrl.split('/');
    if (parts.length >= 2) {
      owner = parts[0];
      repo = parts[1].replace(/\.git$/, "").replace(/\/$/, "");
    }
  }
  
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}. Expected format: https://github.com/owner/repo or owner/repo`);
  }
  
  return { owner, repo };
}

/**
 * Retrieve available branches and find the best matching one
 * Returns the best branch to use, with improved branch finding logic
 */
async function findBestBranch(owner: string, repo: string, requestedBranch: string): Promise<string> {
  const headers = createGitHubHeaders();
  const branchesUrl = `https://api.github.com/repos/${owner}/${repo}/branches`;
  console.log(`Checking available branches: ${branchesUrl}`);
  
  const response = await fetch(branchesUrl, { headers });
  
  if (!response.ok) {
    await handleGitHubApiError(response);
  }
  
  const branches = await response.json() as { name: string }[];
  const branchNames = branches.map(b => b.name);
  console.log(`Available branches: ${branchNames.join(', ')}`);
  
  // Check if requested branch exists (exact match)
  if (branchNames.includes(requestedBranch)) {
    console.log(`Found exact branch match: '${requestedBranch}'`);
    return requestedBranch;
  }
  
  console.log(`Branch '${requestedBranch}' not found. Trying similar branches...`);
  
  // Try to find a branch that's similar to the requested branch (case insensitive)
  const lowerRequestedBranch = requestedBranch.toLowerCase();
  const similarBranch = branchNames.find(
    b => b.toLowerCase() === lowerRequestedBranch
  );
  
  if (similarBranch) {
    console.log(`Found similar branch: '${similarBranch}' (case-insensitive match)`);
    return similarBranch;
  }
  
  // Try to find a partial match
  const partialMatches = branchNames.filter(
    b => b.toLowerCase().includes(lowerRequestedBranch) || 
         lowerRequestedBranch.includes(b.toLowerCase())
  );
  
  if (partialMatches.length > 0) {
    console.log(`Found partial match branch: '${partialMatches[0]}'`);
    return partialMatches[0];
  }
  
  // Try common branch names
  const commonBranches = ['main', 'master', 'develop', 'staging', 'production', 'v2', 'v2.x', 'latest'];
  for (const commonBranch of commonBranches) {
    if (commonBranch !== requestedBranch && branchNames.includes(commonBranch)) {
      console.log(`Using common branch '${commonBranch}' instead.`);
      return commonBranch;
    }
  }
  
  // Fall back to first available branch
  if (branchNames.length > 0) {
    console.log(`Using first available branch: '${branchNames[0]}'`);
    return branchNames[0];
  }
  
  throw new Error(`No valid branches found in repository.`);
}

/**
 * Fetch content of a specific file
 */
async function fetchFileContent(owner: string, repo: string, branch: string, path: string): Promise<string> {
  const headers = createGitHubHeaders();
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  console.log(`Fetching file content from: ${apiUrl}`);
  
  const response = await fetch(apiUrl, { headers });
  console.log(`File content response status: ${response.status} for ${path}`);
  
  if (!response.ok) {
    await handleGitHubApiError(response);
  }
  
  const data = await response.json() as GitHubFile;
  
  // GitHub API returns content as base64 encoded
  if (data.content && data.encoding === 'base64') {
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    // Log a preview of the content
    console.log(`Content preview for ${path}: ${content.substring(0, 100)}...`);
    return content;
  }
  
  throw new Error(`File content is not available for ${path}`);
}

/**
 * Process a directory and its subdirectories recursively
 */
async function processDirectory(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  allFiles: GitHubFile[] = []
): Promise<GitHubFile[]> {
  const headers = createGitHubHeaders();
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  console.log(`Processing directory: ${path ? path : 'root'}`);
  
  try {
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      await handleGitHubApiError(response);
    }
    
    const items = await response.json() as GitHubFile[];
    console.log(`Directory ${path ? path : 'root'} contains ${items.length} items`);
    
    for (const item of items) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        console.log(`Found markdown file: ${item.path}`);
        allFiles.push(item);
      } else if (item.type === 'dir') {
        // Process subdirectory recursively
        await processDirectory(owner, repo, branch, item.path, allFiles);
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error(`Error processing directory ${path}:`, error);
    // Continue with what we have rather than failing completely
    return allFiles;
  }
}

/**
 * Extract image references from markdown content
 */
function extractImageReferences(content: string, filePath: string): Array<{ url: string, alt: string }> {
  const imageRefs: Array<{ url: string, alt: string }> = [];
  const regex = /!\[(.*?)\]\((.*?)\)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const alt = match[1];
    let url = match[2];
    
    // Skip SVG and other inline images
    if (!url.startsWith('data:')) {
      // Handle relative paths
      if (url.startsWith('./') || url.startsWith('../') || !url.startsWith('http')) {
        // This is a simplified approach - a real implementation would properly resolve paths
        if (url.startsWith('./')) {
          url = url.substring(2);
        }
        
        // Store the path as is - we'll handle it when displaying
        imageRefs.push({ url, alt });
      } else {
        // Absolute URL
        imageRefs.push({ url, alt });
      }
    }
  }
  
  return imageRefs;
}

/**
 * Main function to fetch repository files
 * @param repoUrl The GitHub repository URL or owner/repo format
 * @param branch The branch to fetch files from (defaults to main)
 */
export async function fetchRepositoryFiles(
  repoUrl: string,
  branch: string = "main"
): Promise<GitHubRepoContent> {
  console.log(`Fetching files from repository: ${repoUrl}, branch: ${branch}`);
  
  try {
    // Parse the GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);
    console.log(`Parsed GitHub URL - Owner: ${owner}, Repo: ${repo}, Branch: ${branch}`);
    
    // Find the best branch to use
    const actualBranch = await findBestBranch(owner, repo, branch);
    
    // Get all markdown files from the repository
    const markdownFiles = await processDirectory(owner, repo, actualBranch, "");
    console.log(`Found ${markdownFiles.length} Markdown files in repository`);
    
    const files: InsertDocumentationFile[] = [];
    const images: InsertDocumentationImage[] = [];
    
    // Process each markdown file
    for (const file of markdownFiles) {
      console.log(`Processing file: ${file.path}`);
      const fileContent = await fetchFileContent(owner, repo, actualBranch, file.path);
      
      // Extract image references
      const imageRefs = extractImageReferences(fileContent, file.path);
      
      // Create documentation file
      const docFile: InsertDocumentationFile = {
        path: file.path,
        content: fileContent,
        hasImages: imageRefs.length > 0,
        githubUrl: `https://github.com/${owner}/${repo}/blob/${actualBranch}/${file.path}`
      };
      
      files.push(docFile);
      console.log(`Creating new file: ${file.path}`);
      console.log(`Found ${imageRefs.length} images for file: ${file.path}`);
      
      // Add images
      imageRefs.forEach(img => {
        images.push({
          fileId: 0, // Will be replaced with actual file ID when saving
          path: file.path,
          url: img.url,
          alt: img.alt || ""
        });
      });
    }
    
    console.log(`Fetched ${files.length} files and ${images.length} images`);
    return { files, images };
  } catch (error) {
    console.error("Error fetching repository files:", error);
    throw error;
  }
}