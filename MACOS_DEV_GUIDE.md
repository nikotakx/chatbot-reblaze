# MacOS Development Guide for Documentation Chatbot

This guide provides instructions for setting up and running the Documentation Chatbot application on macOS.

## Prerequisites

- Node.js (LTS version 20.x recommended)
- PostgreSQL database
- OpenAI API key
- GitHub token

## Setup Steps

### 1. Install Node.js

We recommend using Node.js v20 LTS for optimal compatibility:

```bash
# Using Homebrew
brew install node@20

# Or using nvm (Node Version Manager)
nvm install 20
nvm use 20
```

### 2. Clone and Setup the Repository

```bash
# Run the setup script
./local-setup.sh
```

This script will:
- Check your Node.js version
- Install dependencies
- Create a template `.env` file
- Generate a local development guide

### 3. Configure Environment Variables

Edit the `.env` file with your credentials:

```
# Database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/your_db_name

# API Keys
OPENAI_API_KEY=your-openai-api-key
GITHUB_TOKEN=your-github-token

# Application settings
NODE_ENV=development
PORT=5000
```

Or export them directly in your terminal:

```bash
export DATABASE_URL='postgresql://username:password@localhost:5432/your_db_name'
export OPENAI_API_KEY='your-openai-api-key'
export GITHUB_TOKEN='your-github-token'
```

### 4. Database Setup

```bash
# Push schema to database
./local-db.sh push

# View database with Drizzle Studio
./local-db.sh studio
```

### 5. Starting the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:5000

## Common MacOS Issues and Solutions

### Node.js Version Issues

If you encounter problems with Node.js v23+ on macOS:

```bash
# Install Node.js v20 LTS
brew install node@20

# Unlink current version and link v20
brew unlink node
brew link node@20

# Or use nvm to switch versions
nvm use 20
```

### Permission Issues

If you encounter permission issues:

```bash
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### PostgreSQL Connection Issues

Make sure PostgreSQL is running:

```bash
# Start PostgreSQL (if installed via Homebrew)
brew services start postgresql

# Create a database
createdb your_db_name
```

## Building for Production

When you're ready to build for production:

```bash
# Build the application
./local-build.sh

# Run the production build
NODE_ENV=production node --experimental-specifier-resolution=node dist/index.js
```

## Additional Scripts

### Database Management

```bash
# Push schema changes
./local-db.sh push

# Start Drizzle Studio
./local-db.sh studio

# Generate migration files
./local-db.sh generate
```

### Application Maintenance

```bash
# Set up local environment
./local-setup.sh

# Build for production
./local-build.sh
```

## Troubleshooting

If the application is not working as expected:

1. Check the console logs for errors
2. Verify environment variables are correctly set
3. Make sure PostgreSQL is running
4. Ensure you're using a compatible Node.js version (v20 recommended)
5. Try clearing node_modules and reinstalling dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

## WebSocket Features

The application uses WebSockets for real-time communication:

- Connection status indicators
- Real-time chat updates
- Analytics broadcasting
- Repository change notifications

You can monitor WebSocket connections in the UI via the connection status indicator.