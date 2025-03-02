# GitHub API Integration Guide

This guide provides detailed information on setting up and troubleshooting GitHub API integration for the Documentation Chatbot application.

## Overview

The Documentation Chatbot uses GitHub's API to fetch markdown files from repositories (both public and private) for indexing and semantic search. This allows users to chat with their documentation through our intelligent interface.

## Setting Up GitHub Token

### Creating a Token

1. Navigate to GitHub's [Personal Access Tokens](https://github.com/settings/tokens) page
2. Click "Generate new token" (classic)
3. Name your token (e.g., "Documentation Chatbot")
4. Set the expiration date (we recommend no more than 90 days for security)
5. Select the appropriate scopes:
   - For **public repositories only**: Select `public_repo`
   - For **private repositories**: Select `repo` (full control of private repositories)
6. Click "Generate token"
7. **Important**: Copy the token immediately - GitHub will only show it once!

### Configuring the Application

Add your token to the application's environment:

```
# .env file
GITHUB_TOKEN=your_github_token_here
```

Or export it directly:

```bash
export GITHUB_TOKEN=your_github_token_here
```

## Repository Access

### Public Repositories

Public repositories can be accessed with minimal permissions. When adding a repository in the admin panel, use one of these formats:

- Full GitHub URL: `https://github.com/username/repository`
- Short format: `username/repository`

### Private Repositories

Private repositories require a token with the `repo` scope. When adding a repository in the admin panel, use the same format as public repositories, but ensure your token has the proper permissions.

## Common Issues and Solutions

### Authentication Errors

**Issue**: Error message like "Bad credentials" or "GitHub API Error: 401 Unauthorized"

**Solutions**:
1. Verify your token is correctly set in the environment variables
2. Check that your token is still valid and hasn't expired
3. Ensure the token has the correct scopes (`repo` for private repositories)
4. Try regenerating a new token if necessary

### Rate Limiting

**Issue**: Error message like "API rate limit exceeded"

**Solutions**:
1. Authenticate with a GitHub token (even for public repositories) to increase rate limits
2. Reduce the frequency of API calls
3. Use conditional requests with ETags to reduce API consumption

### Repository Not Found

**Issue**: Error message like "Not Found" for a repository you know exists

**Solutions**:
1. Check that the repository URL is correctly formatted
2. Verify your account has access to the specified repository
3. For private repositories, ensure your token has the `repo` scope
4. Try using the full URL format (`https://github.com/username/repo`)

### Branch Issues

**Issue**: Specified branch doesn't exist or can't be accessed

**Solutions**:
1. The application will try common branch names automatically (main, master)
2. Specify the correct branch name explicitly in the admin panel
3. Ensure the branch exists in the repository

## Advanced Usage

### Using GitHub Enterprise

If you're using GitHub Enterprise, you'll need to modify the GitHub API base URL in the application code:

1. Locate the GitHub API integration code in `server/lib/github.ts`
2. Update API base URLs from `https://api.github.com/` to your enterprise API endpoint

### Using GitHub Apps Instead of Personal Access Tokens

For production use with many repositories, consider using a GitHub App instead of a personal access token:

1. Create a GitHub App in your organization settings
2. Install the app on repositories you need to access
3. Use the app's JWT to authenticate API requests
4. This provides better security and more granular permissions

## Debugging

To debug GitHub API issues, the application logs detailed information about API requests and responses. Check the application logs for messages related to GitHub API calls to diagnose problems.

```bash
# View application logs
./dev-docker.sh logs app-dev
```

Look for lines containing "GitHub API" for relevant debugging information.