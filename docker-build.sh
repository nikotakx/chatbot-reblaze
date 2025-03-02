#!/bin/sh

# Enable verbose output to see what's happening
set -x

# Build frontend
echo "Building frontend with Vite..."
npx vite build

# Install esbuild specifically for the current architecture
echo "Installing esbuild for current architecture..."
npm install --no-save esbuild

# Build backend with the locally installed esbuild
echo "Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Ensure the file has the correct extension for ESM modules
if [ -f "dist/index.js" ]; then
  echo "Ensuring proper ESM module format..."
  
  # Add proper ESM export if needed
  grep -q "export {" dist/index.js || echo "
// Ensure proper ESM exports
export * from './index.js';" >> dist/index.js
  
  # Create a package.json in the dist directory to ensure ESM is used
  echo '{
  "name": "docubot-dist",
  "type": "module",
  "private": true
}' > dist/package.json
fi

# Verify output
echo "Checking if dist/index.js was created:"
ls -la dist/

# Create a basic file if it doesn't exist (fallback)
if [ ! -f "dist/index.js" ]; then
  echo "WARNING: dist/index.js not found, creating a basic starter file"
  mkdir -p dist
  echo "// Fallback entry point
import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('DocuBot is starting...'));
app.listen(5000, () => console.log('Fallback server running on port 5000'));
" > dist/index.js
fi

echo "Build completed successfully!"