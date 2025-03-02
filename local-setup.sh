#!/bin/sh

# Local development setup script
# This script helps set up and configure your local development environment
# without the overhead of Docker containerization

echo "🔧 Setting up local development environment..."

# Check Node.js version and recommend an appropriate version if necessary
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -gt "20" ]; then
  echo "⚠️  Warning: You're using Node.js v$NODE_VERSION. This project works best with Node.js v20 LTS."
  echo "   Consider switching to Node.js v20 for optimal compatibility."
  echo "   If you have nvm installed, you can run: nvm use 20"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed successfully."

# Set up environment variables if not already set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ Warning: DATABASE_URL environment variable is not set."
  echo "   You'll need this for database operations."
  echo "   Example: export DATABASE_URL='postgresql://username:password@localhost:5432/dbname'"
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️ Warning: OPENAI_API_KEY environment variable is not set."
  echo "   You'll need this for AI functionality."
  echo "   You can get an API key at https://platform.openai.com/account/api-keys"
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set."
  echo "   You'll need this for GitHub repository integration."
  echo "   You can create a token at https://github.com/settings/tokens"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env file template..."
  cat > .env << EOL
# Database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# API Keys
OPENAI_API_KEY=your-openai-api-key
GITHUB_TOKEN=your-github-token

# Application settings
NODE_ENV=development
PORT=5000
EOL
  echo "✅ Created .env template file. Please edit with your actual credentials."
fi

# Create a simple "Getting Started" guide
echo "📋 Creating local development guide..."
cat > LOCAL_DEV_GUIDE.md << EOL
# Local Development Guide

## Getting Started

1. **Set up environment variables**
   Edit the \`.env\` file with your credentials or export them directly in your terminal:
   \`\`\`bash
   export DATABASE_URL='postgresql://username:password@localhost:5432/dbname'
   export OPENAI_API_KEY='your-openai-api-key'
   export GITHUB_TOKEN='your-github-token'
   \`\`\`

2. **Database setup**
   \`\`\`bash
   # Push schema changes to database
   ./local-db.sh push
   \`\`\`

3. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`
   The application will be available at http://localhost:5000

4. **Build for production**
   \`\`\`bash
   ./local-build.sh
   NODE_ENV=production node dist/index.js
   \`\`\`

## File Structure
- \`client/src\` - Frontend React code
- \`server\` - Backend Express API
- \`shared\` - Shared types and utilities
- \`migrations\` - Database migration files

## Helper Scripts
- \`./local-db.sh\` - Database operations
- \`./local-build.sh\` - Build for production
- \`./local-setup.sh\` - Set up local environment

## Troubleshooting
If you encounter issues with Node.js, try using Node.js v20 LTS.
For permission errors with npm, try:
\`\`\`bash
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
\`\`\`
EOL
echo "✅ Created LOCAL_DEV_GUIDE.md"

echo "🎉 Local environment setup complete!"
echo "   To start development, run: npm run dev"
echo "   For more information, see: LOCAL_DEV_GUIDE.md"