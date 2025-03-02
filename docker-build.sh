#!/bin/sh

# Build frontend
echo "Building frontend with Vite..."
npx vite build

# Install esbuild specifically for the current architecture
echo "Installing esbuild for current architecture..."
npm install --no-save esbuild

# Build backend with the locally installed esbuild
echo "Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completed successfully!"