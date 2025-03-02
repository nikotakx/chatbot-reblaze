# Private Repository Integration Guide

This document explains how to configure and use private GitHub repositories with the Documentation Chatbot application.

## Requirements

To use private repositories with this application, you will need:

1. A GitHub account with access to the private repositories you wish to index
2. A Personal Access Token (PAT) with the `repo` scope permissions
3. The repository URL in the format `https://github.com/username/repository` or `username/repository`

## Token Setup

### Creating a Personal Access Token

1. Navigate to GitHub's [Personal Access Tokens](https://github.com/settings/tokens) page
2. Click "Generate new token (classic)"
3. Name your token (e.g., "Documentation Chatbot Access")
4. Set an expiration date (recommended for security)
5. Under "Select scopes", check `repo` (this includes all repo-related permissions)
6. Click "Generate token"
7. **Important**: Copy the token - GitHub will only show it once!

### Configuring the Token in the Application

1. **Docker Environment**:
   ```bash
   # .env file
   GITHUB_TOKEN=your_github_token
   ```

2. **Local Development**:
   ```bash
   # Export directly in your terminal
   export GITHUB_TOKEN=your_github_token
   ```

3. **Production Environment**:
   - Set the token as an environment variable in your hosting platform
   - Ensure the token is stored securely and not exposed in logs or code

## Adding Private Repositories

Once your token is configured, you can add private repositories through the admin dashboard:

1. Navigate to the admin dashboard at `/admin`
2. Go to the "Repository" section
3. Enter the repository URL (e.g., `https://github.com/username/private-repo`)
4. Select the branch (defaults to "main" or "master" if not specified)
5. Click "Add Repository"

The application will authenticate with GitHub using your token and index all markdown files in the repository.

## Security Considerations

### Token Permissions

The `repo` scope provides full access to all your repositories, including sensitive operations like code changes. For enhanced security:

1. Create a dedicated GitHub account with access only to the repositories you want to index
2. Use this account to generate the token, minimizing potential security exposure
3. Regularly rotate your token (create a new one and delete the old one)

### Token Storage

Never store your GitHub token:

1. In version control (add `.env` to your `.gitignore`)
2. In public locations or logs
3. In client-side code (the token should only be used on the server)

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   ```
   GitHub API Error: Bad credentials
   ```
   - Verify your token is correctly set in the environment
   - Check the token hasn't expired
   - Ensure you have access to the repository

2. **Repository Not Found**:
   ```
   GitHub API Error: Not Found
   ```
   - Confirm the repository exists
   - Check that your account has access to the repository
   - Verify the repository URL format is correct

3. **Rate Limiting**:
   ```
   GitHub API Error: API rate limit exceeded
   ```
   - Authenticated requests have higher rate limits (5,000 vs 60 requests per hour)
   - Consider implementing caching for repository content

4. **Database Connection Errors**:
   ```
   Error: connect ECONNREFUSED 172.24.0.2:443
   ```
   - If using Docker, ensure the PostgreSQL database is properly configured in the `docker-compose.yml` file
   - Check that database connection strings are using standard PostgreSQL format, not WebSocket URLs
   - For NeonDB users: Make sure you're using the standard PostgreSQL connection string, not the WebSocket endpoint

5. **WebSocket Errors with Postgres**:
   ```
   WebSocket Error: ECONNREFUSED
   ```
   - This occurs when the application is trying to connect to Postgres via WebSockets instead of using the standard PostgreSQL protocol
   - Verify your database connection is using `pg` package with a standard connection string:
     ```javascript
     const pool = new Pool({ connectionString: process.env.DATABASE_URL });
     ```
   - Not the WebSocket format:
     ```javascript
     // Incorrect format:
     const client = new Client({ webSocketEndpoint: 'wss://postgres/v2' });
     ```

### Detailed Logs

For more detailed troubleshooting, check the application logs:

```bash
# Using Docker
./dev-docker.sh logs app-dev

# Direct shell access
npm run dev
```

### Database Configuration

Make sure your `DATABASE_URL` environment variable follows the standard PostgreSQL connection format:

```
DATABASE_URL=postgres://username:password@hostname:port/database_name
```

If you're using Neon serverless PostgreSQL, get the connection string from your dashboard and ensure it's in the correct format for your environment.

## Related Documentation

For more information, refer to these resources:

- [GitHub API Guide](./GITHUB_API_GUIDE.md) - Detailed information on GitHub API integration
- [Docker Development Guide](../DOCKER_DEV_GUIDE.md) - Docker setup and environment configuration
- [GitHub API Documentation](https://docs.github.com/en/rest) - Official GitHub REST API documentation