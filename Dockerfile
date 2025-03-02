FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Make the build script executable
RUN chmod +x docker-build.sh

# Build using our custom script that handles architecture correctly
RUN ./docker-build.sh

# Debug: Show what's in the dist directory
RUN ls -la dist/

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production

# Use node to directly execute the file with explicit ESM handling for compatibility
CMD ["node", "--experimental-specifier-resolution=node", "--no-warnings", "dist/index.js"]