#!/bin/bash

# BigQuery MCP Server Startup Script
# Usage: ./start-server.sh [service-account.json]

set -e

SERVICE_ACCOUNT_FILE="$1"

# Check if we have service account file as argument
if [ -n "$SERVICE_ACCOUNT_FILE" ]; then
    if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
        echo "Error: Service account file '$SERVICE_ACCOUNT_FILE' not found"
        exit 1
    fi
    echo "Using service account file: $SERVICE_ACCOUNT_FILE"
elif [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ] && [ -z "$GOOGLE_CLOUD_PROJECT" ] && [ -z "$BQ_PROJECT_ID" ]; then
    echo "Error: Configuration required. Either:"
    echo "1. Pass service account file as argument: ./start-server.sh path/to/service-account.json"
    echo "2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable, or"
    echo "3. Set GOOGLE_CLOUD_PROJECT or BQ_PROJECT_ID environment variable"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the project if dist directory doesn't exist
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

echo "Starting BigQuery MCP Server..."
echo "Location: ${BQ_LOCATION:-US}"

# Start the server with optional service account file parameter
if [ -n "$SERVICE_ACCOUNT_FILE" ]; then
    node dist/index.js "$SERVICE_ACCOUNT_FILE"
else
    npm start
fi 