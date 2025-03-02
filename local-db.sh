#!/bin/sh

# Simple local database management script
command=$1

case $command in
  push)
    echo "🔄 Pushing schema changes to database..."
    npx drizzle-kit push
    ;;
  studio)
    echo "🔍 Starting Drizzle Studio..."
    npx drizzle-kit studio
    ;;
  generate)
    echo "📝 Generating migration files..."
    npx drizzle-kit generate
    ;;
  drop)
    echo "⚠️ This will drop all tables. Are you sure? (y/n)"
    read confirmation
    if [ "$confirmation" = "y" ]; then
      echo "🗑️ Dropping all tables..."
      npx drizzle-kit drop
    else
      echo "Operation cancelled."
    fi
    ;;
  *)
    echo "ℹ️ Local Database Management Script"
    echo "Usage: ./local-db.sh [command]"
    echo ""
    echo "Available commands:"
    echo "  push     - Push schema changes to database"
    echo "  studio   - Start Drizzle Studio to view/edit database"
    echo "  generate - Generate migration files"
    echo "  drop     - Drop all tables (use with caution!)"
    ;;
esac

# Always check for DATABASE_URL environment variable
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ Warning: DATABASE_URL environment variable is not set."
  echo "Make sure to set it before running database operations:"
  echo "export DATABASE_URL='postgresql://username:password@localhost:5432/dbname'"
fi