#!/bin/sh

# Local build script for macOS and other environments
# This script builds the application for production without Docker dependencies

# Print each command as it's executed (helpful for debugging)
# Comment the next line if you want less verbose output
set -x

echo "🚀 Starting local build process..."

# Check if Node.js is installed
if ! command -v node > /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js first."
  exit 1
fi

# Clear previous build artifacts
echo "🧹 Cleaning previous build..."
rm -rf dist

# Create dist directory
mkdir -p dist

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build frontend with Vite
echo "🏗️ Building frontend with Vite..."
npx vite build

# Build backend with esbuild
echo "🏗️ Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Ensure proper ESM module format
if [ -f "dist/index.js" ]; then
  echo "✅ Ensuring proper ESM module format..."
  
  # Check if the file needs an export statement
  if ! grep -q "export {" dist/index.js; then
    echo "
// Ensure proper ESM exports
export * from './index.js';" >> dist/index.js
  fi
  
  # Create a package.json in the dist directory for ESM
  echo '{
  "name": "docubot-dist",
  "type": "module",
  "private": true
}' > dist/package.json
fi

# Verify build output
echo "🔍 Verifying build output..."
if [ -f "dist/index.js" ]; then
  echo "✅ Build successful! Backend bundle created at dist/index.js"
  echo "✅ Frontend assets created in dist/assets/"
  ls -la dist/
else
  echo "❌ Build failed. dist/index.js was not created."
  exit 1
fi

echo "🎉 Build completed successfully!"
echo "   To run the production build:"
echo "   NODE_ENV=production node --experimental-specifier-resolution=node dist/index.js"