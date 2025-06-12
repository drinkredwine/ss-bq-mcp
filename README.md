# BigQuery MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Google BigQuery. This server allows you to list datasets, inspect table schemas, and execute SQL queries through MCP tools.

## Features

- **List Datasets**: Get all datasets in your BigQuery project
- **List Tables**: Get all tables in a specific dataset
- **Get Table Schema**: Retrieve detailed schema information for any table
- **Execute Queries**: Run SQL queries with optional dry-run validation
- **Query Results**: Retrieve results from previously executed query jobs

## Transport Options

This server supports two transport protocols:

### 1. **stdio** (Default - Recommended for MCP clients)
- Uses standard input/output for communication
- Perfect for MCP clients like Cursor
- Lightweight and efficient for local integrations

### 2. **HTTP** (For web applications)
- HTTP transport with JSON-RPC over HTTP
- CORS support for web applications
- Health check endpoint

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later recommended)
- A Google Cloud project with the BigQuery API enabled
- A Google Cloud Service Account with BigQuery permissions (e.g., `BigQuery User`, `BigQuery Data Viewer`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd bigquery-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration

### Required Environment Variables
- `GOOGLE_APPLICATION_CREDENTIALS`: The absolute path to your service account JSON key file

### Optional Environment Variables
- `BQ_LOCATION`: The BigQuery location/region (e.g., 'US', 'EU'). Defaults to 'US'
- `GOOGLE_CLOUD_PROJECT` or `BQ_PROJECT_ID`: Only required if not using a service account file

### Setting Up Environment Variables

#### For MCP Clients (Recommended)
Configure environment variables directly in your MCP client configuration.

**Example for Cursor's `~/.cursor/mcp.json`:**
```json
{
    "mcpServers": {
        "bigquery": {
            "command": "node",
            "args": ["/path/to/bigquery-mcp-server/dist/index.js"],
            "env": {
                "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your/service-account.json",
                "BQ_LOCATION": "US"
            }
        }
    }
}
```

#### For Standalone Use
Create a `.env` file in the project root:

```bash
cp config.example.env .env
```

Edit your `.env` file:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
BQ_LOCATION=US
```

## Running the Server

### stdio Transport (Default)
```bash
npm start
```

### HTTP Transport
```bash
npm run start:http
```

### Development Mode
```bash
# stdio
npm run dev

# HTTP
npm run dev:http
```

## HTTP API Usage

When running in HTTP mode, the server exposes:

- **POST `/mcp`** - Send JSON-RPC requests
- **GET `/health`** - Health check endpoint

### Example HTTP Usage

```bash
# Health check
curl http://localhost:3000/health

# List datasets
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_datasets",
      "arguments": {}
    },
    "id": 1
  }'
```

## Available Tools

1. **list_datasets** - List all datasets in your BigQuery project
2. **list_tables** - List all tables in a specific dataset
3. **get_table_schema** - Get detailed schema information for a table
4. **execute_query** - Execute SQL queries with optional dry-run validation
5. **get_query_results** - Retrieve results from previously executed query jobs

For detailed usage examples, see `USAGE_EXAMPLES.md`.

## License

MIT 