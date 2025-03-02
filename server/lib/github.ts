import { InsertDocumentationFile, InsertDocumentationImage } from "@shared/schema";
import fetch from "node-fetch";

/**
 * Creates headers for GitHub API requests with authentication if available
 */
function createGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    // Only log this once to avoid excessive logging
    if (!createGitHubHeaders.hasLoggedTokenMessage) {
      console.log("Using GitHub authentication token for API requests");
      createGitHubHeaders.hasLoggedTokenMessage = true;
    }
  } else if (!createGitHubHeaders.hasLoggedWarningMessage) {
    console.warn("No GitHub token provided. Private repositories will not be accessible.");
    createGitHubHeaders.hasLoggedWarningMessage = true;
  }
  
  return headers;
}

// Add static properties to the function to track if messages have been logged
createGitHubHeaders.hasLoggedTokenMessage = false;
createGitHubHeaders.hasLoggedWarningMessage = false;

/**
 * Handle GitHub API response errors, including rate limiting and authentication issues
 * Provides detailed context-specific error messages for common GitHub API errors
 * 
 * @param {Response} response - The API response to handle
 * @returns {Promise<never>} - Always throws an error with detailed message
 */
async function handleGitHubApiError(response: any): Promise<never> {
  const status = response.status;
  let errorMessage = `GitHub API Error: Status ${status}`;
  
  try {
    const error: GitHubApiError = await response.json() as GitHubApiError;
    errorMessage = `GitHub API Error: ${error.message}`;
    
    // Handle specific error cases with detailed guidance
    if (status === 401) {
      errorMessage += "\n\nAuthentication failed. Please check your GitHub token:\n" +
        "1. Verify the GITHUB_TOKEN environment variable is correctly set\n" +
        "2. Ensure the token hasn't expired\n" +
        "3. Make sure the token has the 'repo' scope for private repositories\n" +
        "4. Try generating a new token at https://github.com/settings/tokens";
    } else if (status === 403) {
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      
      if (rateLimitRemaining === '0') {
        const resetDate = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleString() : 'unknown time';
        errorMessage += `\n\nRate limit exceeded. Rate limit will reset at: ${resetDate}\n` +
          "Consider authenticating with a GitHub token to increase your rate limit.";
      } else {
        errorMessage += "\n\nInsufficient permissions. For private repositories:\n" +
          "1. Ensure your token has the 'repo' scope\n" +
          "2. Verify you have access to this repository\n" +
          "3. Check if your organization has restrictions on token access";
      }
    } else if (status === 404) {
      errorMessage += "\n\nRepository or resource not found. Please check:\n" +
        "1. The repository URL is correctly formatted (use 'owner/repo' or full GitHub URL)\n" +
        "2. The repository exists and hasn't been renamed or deleted\n" +
        "3. For private repositories, ensure your token has 'repo' scope and you have access\n" +
        "4. The branch name is correct (currently using: " + 
        (response.url?.includes('ref=') ? response.url.split('ref=')[1].split('&')[0] : 'unknown') + ")";
    }
    
    // Add documentation reference
    errorMessage += "\n\nSee docs/GITHUB_API_GUIDE.md and docs/PRIVATE_REPOS.md for more information.";
  } catch (parseError) {
    // If we can't parse the JSON, just use the status code
    console.error("Failed to parse GitHub API error response:", parseError);
  }
  
  console.error(errorMessage);
  throw new Error(errorMessage);
}

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
 * Parse GitHub URL to extract owner and repo
 * Handles various GitHub URL formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 * - owner/repo
 * - git@github.com:owner/repo.git
 * 
 * @param {string} repoUrl - The GitHub repository URL to parse
 * @returns {{ owner: string, repo: string }} The extracted owner and repository name
 * @throws {Error} If the URL format is invalid or can't be parsed
 */
function parseGitHubUrl(repoUrl: string): { owner: string, repo: string } {
  // Handle full URL format
  const httpsRegex = /(?:https?:\/\/)?github\.com\/([^\/]+)\/([^\/\?#]+)/i;
  const match = repoUrl.match(httpsRegex);
  
  if (match && match.length >= 3) {
    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");
    return { owner, repo };
  }
  
  // Handle SSH format (git@github.com:owner/repo.git)
  const sshRegex = /git@github\.com:([^\/]+)\/([^\/\?#]+)/i;
  const sshMatch = repoUrl.match(sshRegex);
  
  if (sshMatch && sshMatch.length >= 3) {
    const owner = sshMatch[1];
    const repo = sshMatch[2].replace(/\.git$/, "");
    return { owner, repo };
  }
  
  // Handle simple owner/repo format
  const parts = repoUrl.split('/');
  if (parts.length === 2) {
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    return { owner, repo };
  }
  
  // If we get here, the format wasn't recognized
  throw new Error(`Invalid GitHub URL: ${repoUrl}. Expected format: https://github.com/owner/repo or owner/repo`);
}

export async function fetchRepositoryFiles(
  repoUrl: string,
  branch: string = "master"
): Promise<GitHubRepoContent> {
  // Extract owner and repo from URL
  let owner: string;
  let repo: string;
  
  try {
    const parsed = parseGitHubUrl(repoUrl);
    owner = parsed.owner;
    repo = parsed.repo;
  } catch (error) {
    console.error("Error parsing GitHub URL:", error);
    throw error;
  }
  
  console.log(`Parsed GitHub URL: Owner=${owner}, Repo=${repo}, Branch=${branch}`);
  
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  // First check available branches
  const branchesUrl = `https://api.github.com/repos/${owner}/${repo}/branches`;
  console.log(`Checking available branches: ${branchesUrl}`);
  
  const headers = createGitHubHeaders();
  
  try {
    // Check available branches first
    const branchesResponse = await fetch(branchesUrl, { headers });
    
    if (!branchesResponse.ok) {
      await handleGitHubApiError(branchesResponse);
    }
    
    const branches = await branchesResponse.json() as {name: string}[];
    const branchNames = branches.map(b => b.name);
    console.log(`Available branches: ${branchNames.join(', ')}`);
    
    // Check if specified branch exists
    if (!branchNames.includes(branch)) {
      console.log(`Branch '${branch}' not found.`);
      
      // Try some common branch names
      const commonBranches = ['main', 'master', 'develop', 'dev', 'production', 'staging', 'v2.x', 'v2', 'v1'];
      let foundBranch = false;
      
      // First check if any of the common branches exist
      for (const commonBranch of commonBranches) {
        if (branch !== commonBranch && branchNames.includes(commonBranch)) {
          console.log(`Using '${commonBranch}' branch instead of '${branch}'.`);
          branch = commonBranch;
          foundBranch = true;
          break;
        }
      }
      
      // If no common branch was found, try to find a branch with a similar name
      if (!foundBranch) {
        // Try to find branches that partially match the requested branch
        const similarBranches = branchNames.filter(b => 
          b.includes(branch) || branch.includes(b)
        );
        
        if (similarBranches.length > 0) {
          console.log(`Using similar branch '${similarBranches[0]}' instead of '${branch}'.`);
          branch = similarBranches[0];
          foundBranch = true;
        }
      }
      
      // If still no suitable branch was found, use the default branch if available
      if (!foundBranch && branchNames.length > 0) {
        // Use first available branch (usually the default branch)
        console.log(`Using default branch: ${branchNames[0]}`);
        branch = branchNames[0];
      } else if (!foundBranch) {
        throw new Error(`No valid branches found in repository '${owner}/${repo}'.`);
      }
    }
    
    // Now fetch repository contents
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;
    console.log(`Fetching repository contents from: ${apiUrl}`);
    
    // Fetch repository file tree
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      await handleGitHubApiError(response);
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
  
  const headers = createGitHubHeaders();

  try {
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
  
  const headers = createGitHubHeaders();

  try {
    const response = await fetch(apiUrl, { headers });
    console.log(`Directory response status: ${response.status} for ${path}`);
    
    if (!response.ok) {
      await handleGitHubApiError(response);
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
