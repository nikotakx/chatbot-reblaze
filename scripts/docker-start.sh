#!/bin/bash
set -e

# Start the Docker containers
docker-compose up -d

echo "Docker containers started successfully"
echo "The application is running at http://localhost:5000"