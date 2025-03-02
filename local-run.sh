#!/bin/sh

# Local run script for MacOS and other environments
# This script runs the application in development mode

# Check if Node.js is installed
if ! command -v node > /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js first."
  exit 1
fi

# Print helpful information
echo "🚀 Starting Documentation Chatbot in development mode..."

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ Warning: DATABASE_URL environment variable is not set."
  echo "   Database operations may fail."
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️ Warning: OPENAI_API_KEY environment variable is not set."
  echo "   AI functionality will be limited."
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set."
  echo "   GitHub integration will be limited."
fi

# Check if .env file exists and source it if it does
if [ -f .env ]; then
  echo "📝 Using environment variables from .env file"
  # Source the .env file in a way that works with most shells
  export $(grep -v '^#' .env | xargs)
fi

# Run the application
echo "🌐 Starting server..."
echo "   The application will be available at http://localhost:5000"
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the application
npm run dev

# In case of failure, offer alternative
if [ $? -ne 0 ]; then
  echo "❌ Failed to start with npm run dev"
  echo "🔄 Trying alternative method..."
  npx tsx server/index.ts
fi