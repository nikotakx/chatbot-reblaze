#!/bin/sh

# Simple local build script for development
echo "🔨 Starting local build process..."

# Build frontend with Vite
echo "📦 Building frontend with Vite..."
npx vite build

# Build backend with esbuild
echo "📦 Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Verify the output
echo "✅ Checking build output..."
if [ -f "dist/index.js" ]; then
    echo "🎉 Success! Build completed successfully."
    echo "ℹ️ You can now start the application with: NODE_ENV=production node dist/index.js"
else
    echo "❌ Error: dist/index.js not found. The build process failed."
    exit 1
fi