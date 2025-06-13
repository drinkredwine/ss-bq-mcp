# MCP Servers for Google Services

A collection of Model Context Protocol (MCP) servers for Google Cloud services. This monorepo contains multiple MCP servers that provide tools for interacting with various Google APIs.

## Available Servers

### 1. BigQuery MCP Server (`@mcp-servers/bigquery`)
- **List Datasets**: Get all datasets in your BigQuery project
- **List Tables**: Get all tables in a specific dataset
- **Get Table Schema**: Retrieve detailed schema information for any table
- **Execute Queries**: Run SQL queries with optional dry-run validation
- **Query Results**: Retrieve results from previously executed query jobs

### 2. Google Ads MCP Server (`@mcp-servers/google-ads`)
- **List Customers**: Get all accessible Google Ads customers
- **Get Customer Info**: Retrieve detailed customer information
- **List Campaigns**: Get all campaigns for a customer
- **Campaign Performance**: Get performance metrics for campaigns
- **Execute GAQL**: Run custom Google Ads Query Language queries

## Architecture

This project uses a **monorepo structure** with shared utilities:

```
mcp-servers/
├── packages/
│   ├── shared/           # Shared utilities and base classes
│   ├── bigquery/         # BigQuery MCP server
│   └── google-ads/       # Google Ads MCP server
├── package.json          # Root workspace configuration
└── README.md
```

### Benefits of This Architecture

- **Code Reuse**: Shared authentication, transport, and utility code
- **Consistency**: All servers follow the same patterns and conventions
- **Maintainability**: Single codebase for all Google service integrations
- **Extensibility**: Easy to add new Google service servers

## Transport Options

Both servers support two transport protocols:

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
- A Google Cloud project with appropriate APIs enabled
- Service account credentials for authentication

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd mcp-servers
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build all packages:**
   ```bash
   npm run build
   ```

## Configuration

### BigQuery Server

#### Required Environment Variables
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account JSON key file

#### Optional Environment Variables
- `BQ_LOCATION`: BigQuery location/region (e.g., 'US', 'EU'). Defaults to 'US'
- `GOOGLE_CLOUD_PROJECT` or `BQ_PROJECT_ID`: Only required if not using a service account file

### Google Ads Server

#### Required Environment Variables
- `GOOGLE_ADS_CUSTOMER_ID`: Your Google Ads customer ID
- `GOOGLE_ADS_DEVELOPER_TOKEN`: Your Google Ads API developer token
- `GOOGLE_ADS_CLIENT_ID`: OAuth2 client ID
- `GOOGLE_ADS_CLIENT_SECRET`: OAuth2 client secret
- `GOOGLE_ADS_REFRESH_TOKEN`: OAuth2 refresh token

### Setting Up Environment Variables

#### For MCP Clients (Recommended)
Configure environment variables directly in your MCP client configuration.

**Example for Cursor's `~/.cursor/mcp.json`:**
```json
{
    "mcpServers": {
        "bigquery": {
            "command": "node",
            "args": ["/path/to/mcp-servers/packages/bigquery/dist/index.js"],
            "env": {
                "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your/service-account.json",
                "BQ_LOCATION": "US"
            }
        },
        "google-ads": {
            "command": "node",
            "args": ["/path/to/mcp-servers/packages/google-ads/dist/index.js"],
            "env": {
                "GOOGLE_ADS_CUSTOMER_ID": "1234567890",
                "GOOGLE_ADS_DEVELOPER_TOKEN": "your-developer-token",
                "GOOGLE_ADS_CLIENT_ID": "your-client-id",
                "GOOGLE_ADS_CLIENT_SECRET": "your-client-secret",
                "GOOGLE_ADS_REFRESH_TOKEN": "your-refresh-token"
            }
        }
    }
}
```

## Running the Servers

### BigQuery Server

```bash
# stdio transport (default)
npm run start:bigquery

# HTTP transport
npm run start:bigquery:http

# Development mode
npm run dev:bigquery
npm run dev:bigquery:http
```

### Google Ads Server

```bash
# stdio transport (default)
npm run start:google-ads

# HTTP transport
npm run start:google-ads:http

# Development mode
npm run dev:google-ads
npm run dev:google-ads:http
```

## HTTP API Usage

When running in HTTP mode, servers expose:

- **POST `/mcp`** - Send JSON-RPC requests
- **GET `/health`** - Health check endpoint

### Example HTTP Usage

```bash
# Health check (BigQuery server on port 3000)
curl http://localhost:3000/health

# List BigQuery datasets
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

# List Google Ads customers (Google Ads server on port 3001)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_customers",
      "arguments": {}
    },
    "id": 1
  }'
```

## Available Tools

### BigQuery Server Tools

1. **list_datasets** - List all datasets in your BigQuery project
2. **list_tables** - List all tables in a specific dataset
3. **get_table_schema** - Get detailed schema information for a table
4. **execute_query** - Execute SQL queries with optional dry-run validation
5. **get_query_results** - Retrieve results from previously executed query jobs

### Google Ads Server Tools

1. **list_customers** - List all accessible Google Ads customers
2. **get_customer_info** - Get detailed information about a specific customer
3. **list_campaigns** - List all campaigns for a customer
4. **get_campaign_performance** - Get performance metrics for campaigns
5. **execute_gaql_query** - Execute custom Google Ads Query Language queries

## Development

### Adding a New Google Service Server

1. Create a new package directory: `packages/new-service/`
2. Create `package.json` with dependency on `@mcp-servers/shared`
3. Extend `BaseMCPServer` class from the shared package
4. Implement the required abstract methods
5. Add build scripts to root `package.json`

### Project Structure

- **`packages/shared/`**: Common utilities, authentication, and base server class
- **`packages/bigquery/`**: BigQuery-specific implementation
- **`packages/google-ads/`**: Google Ads-specific implementation

## Authentication Setup

### Google Cloud Service Account (for BigQuery)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the BigQuery API
4. Create a service account with BigQuery permissions
5. Download the JSON key file
6. Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

### Google Ads API Setup

1. Apply for Google Ads API access
2. Create OAuth2 credentials in Google Cloud Console
3. Generate a refresh token using the OAuth2 flow
4. Set all required environment variables

## License

MIT 