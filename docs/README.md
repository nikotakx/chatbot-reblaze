# Documentation Chatbot

A sophisticated documentation chatbot that leverages OpenAI to process and interact with complex documentation repositories, offering intelligent query processing and an engaging user interface.

## Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Docker Setup](#docker-setup)
4. [API Documentation](#api-documentation)
5. [Architecture](#architecture)
6. [Testing](#testing)

## Requirements

- Node.js (v20+)
- PostgreSQL (v15+)
- OpenAI API Key
- GitHub Token (for accessing repositories)

## Installation

### Local Development

1. Clone the repository

```bash
git clone https://github.com/yourusername/documentation-chatbot.git
cd documentation-chatbot
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/docubot
OPENAI_API_KEY=your-openai-api-key
GITHUB_TOKEN=your-github-token
```

4. Initialize the database

```bash
npm run db:push
```

5. Start the development server

```bash
npm run dev
```

The application will be available at http://localhost:5000.

## Docker Setup

### Prerequisites

- Docker and Docker Compose installed on your system

### Running with Docker

1. Build and start the containers

```bash
./scripts/docker-build.sh
./scripts/docker-start.sh
```

Or manually:

```bash
docker-compose up -d
```

2. The application will be available at http://localhost:5000

3. To stop the containers:

```bash
docker-compose down
```

4. To view logs:

```bash
docker-compose logs -f
```

### Environment Variables in Docker

The following environment variables need to be set when running with Docker:

- `OPENAI_API_KEY`: Your OpenAI API key
- `GITHUB_TOKEN`: Your GitHub token for repository access

You can set these by creating a `.env` file with these values before running docker-compose.

## API Documentation

The Documentation Chatbot exposes the following REST API endpoints:

### Health Check

- **URL**: `/api/health`
- **Method**: `GET`
- **Description**: Check if the API is up and running
- **Success Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "timestamp": "2023-05-30T12:00:00Z"
  }
  ```

### Chat Endpoints

#### Send a Message

- **URL**: `/api/chat`
- **Method**: `POST`
- **Description**: Send a message to the chatbot
- **Request Body**:
  ```json
  {
    "message": "What is the documentation about?",
    "sessionId": "optional-session-id"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "message": "The documentation covers...",
    "sessionId": "87f5a1bf-18cc-4f7c-abb2-8e8322fdccbc"
  }
  ```

#### Get Chat History

- **URL**: `/api/chat/:sessionId`
- **Method**: `GET`
- **Description**: Get the chat history for a specific session
- **URL Parameters**: `sessionId=[string]`
- **Success Response**: `200 OK`
  ```json
  [
    {
      "id": 1,
      "sessionId": "87f5a1bf-18cc-4f7c-abb2-8e8322fdccbc",
      "role": "user",
      "content": "What is the documentation about?",
      "timestamp": "2023-05-30T12:00:00Z"
    },
    {
      "id": 2,
      "sessionId": "87f5a1bf-18cc-4f7c-abb2-8e8322fdccbc",
      "role": "assistant",
      "content": "The documentation covers...",
      "timestamp": "2023-05-30T12:00:05Z"
    }
  ]
  ```

### Admin Endpoints

#### Documentation Management

##### Get All Documentation Files

- **URL**: `/api/admin/documentation`
- **Method**: `GET`
- **Description**: Get all documentation files
- **Success Response**: `200 OK`
  ```json
  {
    "files": [
      {
        "id": 1,
        "path": "introduction/getting-started.md",
        "content": "# Getting Started\n\nThis guide will...",
        "lastUpdated": "2023-05-30T12:00:00Z",
        "hasImages": true,
        "githubUrl": "https://github.com/user/repo/blob/main/docs/introduction/getting-started.md"
      }
    ]
  }
  ```

##### Get Documentation File by ID

- **URL**: `/api/admin/documentation/:id`
- **Method**: `GET`
- **Description**: Get a specific documentation file by ID
- **URL Parameters**: `id=[number]`
- **Success Response**: `200 OK`
  ```json
  {
    "file": {
      "id": 1,
      "path": "introduction/getting-started.md",
      "content": "# Getting Started\n\nThis guide will...",
      "lastUpdated": "2023-05-30T12:00:00Z",
      "hasImages": true,
      "githubUrl": "https://github.com/user/repo/blob/main/docs/introduction/getting-started.md"
    }
  }
  ```

#### Repository Management

##### Get Repository Configuration

- **URL**: `/api/admin/repository`
- **Method**: `GET`
- **Description**: Get current repository configuration
- **Success Response**: `200 OK`
  ```json
  {
    "config": {
      "id": 1,
      "url": "https://github.com/user/repo",
      "branch": "main",
      "lastSynced": "2023-05-30T12:00:00Z",
      "isActive": true
    }
  }
  ```

##### Update Repository Configuration

- **URL**: `/api/admin/repository`
- **Method**: `POST`
- **Description**: Update repository configuration
- **Request Body**:
  ```json
  {
    "url": "https://github.com/user/repo",
    "branch": "main"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "config": {
      "id": 1,
      "url": "https://github.com/user/repo",
      "branch": "main",
      "lastSynced": "2023-05-30T12:00:00Z",
      "isActive": true
    }
  }
  ```

##### Refresh Repository

- **URL**: `/api/admin/refresh`
- **Method**: `POST`
- **Description**: Refresh documentation from the repository
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Repository refreshed successfully",
    "stats": {
      "filesProcessed": 15,
      "chunksCreated": 120,
      "imagesProcessed": 8
    }
  }
  ```

#### Analytics and Stats

##### Get Documentation Stats

- **URL**: `/api/admin/stats`
- **Method**: `GET`
- **Description**: Get documentation statistics
- **Success Response**: `200 OK`
  ```json
  {
    "fileCount": 15,
    "chunkCount": 120,
    "imageCount": 8,
    "lastSynced": "2023-05-30T12:00:00Z"
  }
  ```

##### Get Chat Analytics

- **URL**: `/api/admin/analytics`
- **Method**: `GET`
- **Description**: Get chat usage analytics
- **Success Response**: `200 OK`
  ```json
  {
    "summary": {
      "totalSessions": 25,
      "totalQueries": 120,
      "totalResponses": 120,
      "estimatedTokens": {
        "input": 24000,
        "output": 36000,
        "total": 60000
      }
    },
    "timeSeries": [
      {
        "date": "2023-05-30",
        "queries": 45,
        "responses": 45
      }
    ],
    "topQueryTerms": [
      {
        "term": "installation",
        "count": 15
      }
    ]
  }
  ```

##### Get Chat Sessions

- **URL**: `/api/admin/chats`
- **Method**: `GET`
- **Description**: Get all chat sessions
- **Success Response**: `200 OK`
  ```json
  {
    "sessions": [
      {
        "sessionId": "87f5a1bf-18cc-4f7c-abb2-8e8322fdccbc",
        "messageCount": 10,
        "startTime": "2023-05-30T12:00:00Z",
        "lastActivity": "2023-05-30T12:15:00Z"
      }
    ]
  }
  ```

##### Delete Chat Message

- **URL**: `/api/admin/chat/:id`
- **Method**: `DELETE`
- **Description**: Delete a chat message
- **URL Parameters**: `id=[number]`
- **Success Response**: `200 OK`
  ```json
  {
    "success": true
  }
  ```

## Architecture

The Documentation Chatbot is built with a modern full-stack architecture using the following technologies:

### Frontend
- React with TypeScript
- Tailwind CSS for styling with shadcn/ui components
- React Query for state management
- Wouter for routing
- Recharts for visualizations

### Backend
- Express.js server
- PostgreSQL database with Drizzle ORM
- OpenAI API integration for natural language processing
- GitHub API for repository fetching
- Vectorized search for document retrieval

### Data Flow
1. Documentation is fetched from GitHub repositories
2. Content is processed, chunked, and stored in the database
3. Vector embeddings are created for semantic search
4. User queries are matched with relevant documentation
5. OpenAI processes the query along with context
6. Response is provided to the user in a conversational format

## Testing

### Running Tests

```bash
npm test
```

### Testing Strategy

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test API endpoints and database interactions 
3. **End-to-End Tests**: Test the complete application flow

### Key Test Files

- `__tests__/unit/` - Unit tests for utilities and helpers
- `__tests__/integration/` - Integration tests for APIs
- `__tests__/e2e/` - End-to-end tests for application flow