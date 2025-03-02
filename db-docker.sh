#!/bin/sh

# Docker database management script
# This script provides advanced database operations for the Docker environment

command=$1

# Check if Docker Compose is installed
if ! command -v docker-compose > /dev/null; then
  echo "⚠️ Docker Compose not found. Please install Docker Compose first."
  exit 1
fi

case $command in
  push)
    echo "🔄 Pushing schema changes to database..."
    docker-compose -f docker-compose.dev.yml exec app-dev npx drizzle-kit push
    ;;
  
  studio)
    echo "🔍 Starting Drizzle Studio inside Docker..."
    docker-compose -f docker-compose.dev.yml exec app-dev npx drizzle-kit studio --port 4000
    echo "✅ Drizzle Studio should be available at http://localhost:4000"
    ;;
  
  migrate)
    echo "🔄 Generating and applying migrations..."
    docker-compose -f docker-compose.dev.yml exec app-dev npx drizzle-kit generate:pg --schema=./server/db/schema.ts
    echo "✅ Migration files generated"
    ;;
  
  backup)
    timestamp=$(date +%Y%m%d_%H%M%S)
    echo "💾 Creating database backup..."
    docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres docubot > "./backup_${timestamp}.sql"
    echo "✅ Backup created: ./backup_${timestamp}.sql"
    ;;
  
  restore)
    backup_file=$2
    if [ -z "$backup_file" ]; then
      echo "⚠️ No backup file specified."
      echo "Usage: ./db-docker.sh restore <backup_file>"
      exit 1
    fi
    
    echo "♻️ Restoring database from backup: $backup_file"
    cat "$backup_file" | docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres docubot
    echo "✅ Database restored"
    ;;
  
  reset)
    echo "⚠️ This will delete all database data. Are you sure? (y/n)"
    read confirmation
    if [ "$confirmation" = "y" ]; then
      echo "🗑️ Resetting database..."
      docker-compose -f docker-compose.dev.yml down -v
      # Start just the database first to ensure it's initialized before the app connects
      docker-compose -f docker-compose.dev.yml up -d postgres
      echo "⏳ Waiting for database to initialize..."
      sleep 5
      # Start remaining services
      ./dev-docker.sh up-detached
      echo "✅ Database reset complete"
    else
      echo "❌ Operation cancelled."
    fi
    ;;
  
  psql)
    echo "🔌 Connecting to PostgreSQL..."
    docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres docubot
    ;;
  
  *)
    echo "📖 Docker Database Management Commands:"
    echo ""
    echo "Usage: ./db-docker.sh [command]"
    echo ""
    echo "Available commands:"
    echo "  push     - Push schema changes to database"
    echo "  studio   - Start Drizzle Studio for database management"
    echo "  migrate  - Generate and apply migrations"
    echo "  backup   - Create a database backup"
    echo "  restore  - Restore database from backup"
    echo "  reset    - Reset database (will delete all data)"
    echo "  psql     - Open PostgreSQL interactive terminal"
    ;;
esac