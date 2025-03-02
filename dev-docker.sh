#!/bin/sh

# Docker development script
# This script provides commands for Docker-based development

command=$1

case $command in
  up)
    echo "🚀 Starting development environment in Docker..."
    docker-compose -f docker-compose.dev.yml up --build
    ;;
  
  up-detached)
    echo "🚀 Starting development environment in Docker (detached)..."
    docker-compose -f docker-compose.dev.yml up -d --build
    ;;
  
  down)
    echo "🛑 Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down
    ;;
  
  db-push)
    echo "🔄 Pushing schema changes to database..."
    docker-compose -f docker-compose.dev.yml exec app-dev npx drizzle-kit push
    ;;
  
  db-studio)
    echo "🔍 Starting Drizzle Studio inside Docker..."
    # Exposing Drizzle Studio on port 4000 for database management
    docker-compose -f docker-compose.dev.yml exec app-dev npx drizzle-kit studio --port 4000
    echo "✅ Drizzle Studio should be available at http://localhost:4000"
    ;;
  
  logs)
    echo "📋 Showing logs..."
    docker-compose -f docker-compose.dev.yml logs -f
    ;;
  
  restart)
    echo "🔄 Restarting services..."
    docker-compose -f docker-compose.dev.yml restart
    ;;
  
  shell)
    echo "🐚 Opening shell in app container..."
    docker-compose -f docker-compose.dev.yml exec app-dev /bin/sh
    ;;
  
  *)
    echo "📖 Development Docker Commands:"
    echo ""
    echo "Usage: ./dev-docker.sh [command]"
    echo ""
    echo "Available commands:"
    echo "  up               - Start development environment"
    echo "  up-detached      - Start development environment in detached mode"
    echo "  down             - Stop development environment"
    echo "  db-push          - Push schema changes to database"
    echo "  db-studio        - Start Drizzle Studio for database management"
    echo "  logs             - Show container logs"
    echo "  restart          - Restart all services"
    echo "  shell            - Open shell in app container"
    echo ""
    echo "Environment Info:"
    echo "  - Database is available at localhost:5432"
    echo "  - pgAdmin is available at http://localhost:8080"
    echo "  - Web application is available at http://localhost:5000"
    ;;
esac