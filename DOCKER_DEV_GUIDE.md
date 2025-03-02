# Docker Development Guide for Documentation Chatbot

This guide provides instructions for running the Documentation Chatbot application in a local Docker environment.

## Prerequisites

- Docker and Docker Compose installed
- OpenAI API key
- GitHub token

## Quick Start

```bash
# Start the development environment
./dev-docker.sh up

# Or in detached mode
./dev-docker.sh up-detached
```

## Available Services

The development environment includes:

- **Web Application** - Available at http://localhost:5000
- **PostgreSQL Database** - Available at localhost:5432
- **pgAdmin** - Database administration UI at http://localhost:8080
  - Login: admin@example.com
  - Password: admin

## Environment Setup

Before starting the development environment, make sure to set up your environment variables:

```bash
# Create a .env file or export variables directly
export OPENAI_API_KEY=your-openai-api-key
export GITHUB_TOKEN=your-github-token
```

For accessing private GitHub repositories, you **must** provide a valid GitHub token with appropriate repository access permissions:

1. Go to your GitHub account settings
2. Navigate to "Developer Settings" > "Personal Access Tokens" > "Tokens (classic)"
3. Create a new token with at least the "repo" scope (full control of private repositories)
4. Export the token before starting the containers:
   ```bash
   export GITHUB_TOKEN=your-github-token
   ```

### Token Security Considerations

When working with GitHub tokens, follow these security best practices:

1. **Set appropriate scopes**: Only grant the minimal permissions needed
   - Use `public_repo` for public repositories only
   - Use `repo` for private repositories

2. **Set expiration dates**: Choose a reasonable expiration date for your token

3. **Environment variables**: Store tokens as environment variables instead of hardcoding them
   ```bash
   # Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
   export GITHUB_TOKEN=your-token-here
   ```

4. **Docker Compose**: Pass tokens securely through environment variables
   ```yaml
   services:
     app:
       environment:
         - GITHUB_TOKEN=${GITHUB_TOKEN}
   ```

5. **Never commit tokens**: Add `.env` files to your `.gitignore` to prevent accidentally committing secrets

6. **Rotate tokens**: Regularly generate new tokens and revoke old ones

## Command Reference

The `dev-docker.sh` script provides easy commands for Docker operations:

| Command | Description |
|---------|-------------|
| `./dev-docker.sh up` | Start development environment |
| `./dev-docker.sh up-detached` | Start in detached mode |
| `./dev-docker.sh down` | Stop development environment |
| `./dev-docker.sh db-push` | Push schema changes to database |
| `./dev-docker.sh db-studio` | Start Drizzle Studio |
| `./dev-docker.sh logs` | Show all container logs |
| `./dev-docker.sh logs [service]` | Show logs for specific service (app-dev, postgres, pgadmin) |
| `./dev-docker.sh restart` | Restart all services |
| `./dev-docker.sh restart [service]` | Restart specific service (app-dev, postgres, pgadmin) |
| `./dev-docker.sh shell` | Open shell in app container |

## Development Workflow

1. Start the development environment:
   ```bash
   ./dev-docker.sh up
   ```

2. Make changes to your code - the changes will be reflected immediately thanks to volume mounting and hot reloading.

3. If you make changes to the database schema:
   ```bash
   ./dev-docker.sh db-push
   ```

4. To view and manage the database directly, use Drizzle Studio:
   ```bash
   ./dev-docker.sh db-studio
   ```
   Then access Drizzle Studio at http://localhost:4000

5. When you're done, shut down the environment:
   ```bash
   ./dev-docker.sh down
   ```

## Container Structure

- **app-dev**: Node.js application with hot reloading
- **postgres**: PostgreSQL database
- **pgadmin**: Database administration UI

## Persisted Data

The following data is persisted across container restarts:

- **Database data**: Stored in the `postgres_data` volume
- **Node modules**: Stored in the `node_modules` volume to avoid rebuilding

## Troubleshooting

### Database Connection Issues

If you're having trouble connecting to the database:

```bash
# Check if all containers are running
docker-compose -f docker-compose.dev.yml ps

# Check postgres logs
./dev-docker.sh logs postgres

# Reset database (will delete all data)
./dev-docker.sh down
# Use -v flag to remove volumes
docker-compose -f docker-compose.dev.yml down -v
./dev-docker.sh up-detached
```

#### WebSocket Connection Errors

If you see errors like `connect ECONNREFUSED 172.24.0.2:443` or WebSocket errors related to Postgres:

1. This typically happens when the application is trying to connect to Postgres via WebSockets instead of using the standard PostgreSQL protocol.

2. Check your database connection configuration:

```javascript
// Ensure you're using a standard PostgreSQL connection
// NOT a WebSocket connection - correct format:
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// INCORRECT format (don't use this):
const client = new Client({
  webSocketEndpoint: 'wss://postgres/v2'
});
```

3. For NeonDB users: Make sure you're using the standard PostgreSQL connection string, not the WebSocket endpoint:

```
// Use this format:
DATABASE_URL=postgres://user:password@host:port/database

// Not this format:
DATABASE_URL=wss://host/v2
```

4. Restart the application after making these changes:

```bash
./dev-docker.sh restart app-dev
```

### Application Issues

If the application isn't working correctly:

```bash
# Check application logs
./dev-docker.sh logs app-dev

# Restart just the application container
./dev-docker.sh restart app-dev

# Open a shell in the application container
./dev-docker.sh shell
```

### Port Conflicts

If you have port conflicts, edit `docker-compose.dev.yml` to change the port mappings before starting the services.

### pgAdmin Issues

If pgAdmin is not starting or you're having trouble logging in:

```bash
# Check pgAdmin logs
./dev-docker.sh logs pgadmin

# Restart just pgAdmin
./dev-docker.sh restart pgadmin
```

When connecting to PostgreSQL in pgAdmin:
1. Add a new server
2. Connection settings:
   - Host: postgres (use the service name, not localhost)
   - Port: 5432
   - Username: postgres
   - Password: postgres