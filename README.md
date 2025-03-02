# Documentation Chatbot

A sophisticated documentation chatbot leveraging WebSocket technologies for real-time, interactive documentation exploration. This application provides seamless communication between client and server with robust message handling and intelligent search capabilities.

## Features

- 💬 Real-time chat with OpenAI-powered responses
- 📊 Admin dashboard for analytics and monitoring
- 🔄 WebSocket communication for instant updates
- 🔍 Intelligent semantic search of documentation
- 📚 GitHub repository integration
- 💾 PostgreSQL database for persistence
- 📝 Markdown content support

## Prerequisites

Before you get started, make sure you have the following:

- Docker and Docker Compose installed on your machine
- An OpenAI API key
- A GitHub token (for repository access)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd documentation-chatbot
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
GITHUB_TOKEN=your_github_token
```

### 3. Build and Run with Docker Compose

```bash
docker-compose up --build
```

If you encounter any architecture-related issues with esbuild during the build process, try our fixed Dockerfile by running:

```bash
# Make the build script executable
chmod +x docker-build.sh

# Rebuild the Docker image and start the containers
docker-compose up --build
```

### 4. Access the Application

Once the containers are up and running:

- Main application: http://localhost:5000
- Admin dashboard: http://localhost:5000/admin

## Development

### Running Locally (Without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in a `.env` file

3. Start the development server:
   ```bash
   npm run dev
   ```

### Testing

Run the automated tests:

```bash
npm test
```

## Troubleshooting

### Exec Format Error with esbuild

If you encounter an "Exec format error" with esbuild during the Docker build process, it's typically due to an architecture mismatch. Our updated Dockerfile should handle this automatically by:

1. Installing esbuild specifically for your current architecture
2. Using npx to run the correct binary

If you still face issues, you can try:

```bash
# For ARM-based systems (e.g., Apple Silicon)
npm install --platform=darwin --arch=arm64 esbuild

# For x86-based systems
npm install --platform=linux --arch=x64 esbuild
```

## License

MIT