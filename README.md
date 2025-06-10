# BigQuery MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Google BigQuery. This server allows you to list datasets, inspect table schemas, and execute SQL queries through MCP tools.

## Getting Started

Follow these steps to get the server up and running.

### Prerequisites

*   [Node.js](httpss://nodejs.org/en/) (v18 or later recommended)
*   A Google Cloud project with the BigQuery API enabled.
*   A Google Cloud Service Account with BigQuery permissions (e.g., `BigQuery User`, `BigQuery Data Viewer`). You will need the JSON key file for this service account.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/drinkredwine/ss-bq-mcp.git
    cd ss-bq-mcp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the project:**
    ```bash
    npm run build
    ```

### Configuration

The server needs to be configured with your Google Cloud credentials. The recommended method is to use a service account key file.

1.  **Copy the example configuration file:**
    Create a `.env` file for your environment variables. You can start by copying the example file.
    ```bash
    cp config.example.env .env
    ```

2.  **Set Environment Variables:**
    The server can be configured via a `.env` file or environment variables. The easiest way to get started is to set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service account JSON key file. The project ID will be automatically detected from the key file.

    Your `.env` file should look like this:
    ```
    # Path to your service account JSON key file.
    # The Project ID will be inferred from this file.
    GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json

    # Optional: BigQuery location/region (defaults to 'US')
    # BQ_LOCATION='US'
    ```

    Alternatively, you can export this variable in your shell.

### Running the Server

Once configured, you can start the server.

```bash
npm start
```

This will run the compiled server from the `dist/` directory.

For development, you can run the server in watch mode:

```bash
npm run dev
```

## Usage

### MCP Tools

The server provides the following tools that can be called from an MCP client:

#### `list_datasets`
Lists all datasets in the BigQuery project.

**Parameters:** None

#### `list_tables`
Lists all tables in a specific dataset.

**Parameters:**
- `datasetId` (string, required): The dataset ID to list tables from.

#### `get_table_schema`
Gets the schema of a specific table.

**Parameters:**
- `datasetId` (string, required): The dataset ID containing the table.
- `tableId` (string, required): The table ID to get schema for.

#### `execute_query`
Executes a BigQuery SQL query.

**Parameters:**
- `query` (string, required): The SQL query to execute.
- `maxResults` (number, optional): Maximum number of results to return (default: 100).
- `dryRun` (boolean, optional): If true, only validate the query without executing it (default: false).

#### `get_query_results`
Gets results from a previously executed query job.

**Parameters:**
- `jobId` (string, required): The job ID of the query to get results for.
- `maxResults` (number, optional): Maximum number of results to return (default: 100).

---

For more detailed examples on how to use these tools with an MCP client, please refer to `USAGE_EXAMPLES.md`.

## Authentication Methods

The server supports multiple authentication methods with Google Cloud.

### 1. Service Account Key File (Recommended)
Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the absolute path of your service account JSON key file. The project ID will be automatically inferred. This is the most reliable method for running the server in any environment.

### 2. Default Application Credentials
If you are running the server on a Google Cloud service (like Compute Engine, Cloud Run, GKE), it can automatically use the credentials of the service's attached service account. In this case, you may need to explicitly set your project ID.

Set `GOOGLE_CLOUD_PROJECT` or `BQ_PROJECT_ID` environment variable:
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### 3. User Credentials (Local Development)
For local development, you can authenticate using your own Google Cloud account. First, install the `gcloud` CLI and then run:
```bash
gcloud auth application-default login
```
You will also need to set your project ID.
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## Features

- **List Datasets**: Get all datasets in your BigQuery project
- **List Tables**: Get all tables in a specific dataset
- **Get Table Schema**: Retrieve detailed schema information for any table
- **Execute Queries**: Run SQL queries with optional dry-run validation
- **Query Results**: Retrieve results from previously executed query jobs

## Configuration

The server can be configured in two ways:

### Recommended: Service Account File (Simplest)
Just set the path to your service account JSON file. The project ID will be automatically read from the file:
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account key file

### Alternative: Manual Configuration
- `GOOGLE_CLOUD_PROJECT` or `BQ_PROJECT_ID`: Your Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account key file (optional)

### Optional
- `BQ_LOCATION`: BigQuery location/region (default: 'US')

## Authentication

You can authenticate with BigQuery using one of the following methods:

### 1. Service Account Key File (Recommended)
Simply set the path to your service account JSON file. The project ID will be automatically extracted:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

**That's it!** No need to set project ID separately when using a service account file.

### 2. Default Application Credentials
If running on Google Cloud (Compute Engine, Cloud Run, etc.), the server will automatically use the default service account. You'll need to set the project ID manually:
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### 3. User Credentials (for development)
You can use `gcloud auth application-default login` to set up user credentials for development. You'll need to set the project ID manually:
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

## Usage

### Running the Server

```bash
# Method 1: Pass service account file as argument (recommended)
node dist/index.js /path/to/your/service-account.json

# Method 2: Using the startup script
./scripts/start-server.sh /path/to/your/service-account.json

# Method 3: Using environment variables
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account.json"
npm start

# Development mode with tsx
npm run dev
```

### MCP Tools

The server provides the following tools:

#### `list_datasets`
Lists all datasets in the BigQuery project.

**Parameters:** None

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Found 2 datasets:\n\n[\n  {\n    \"id\": \"my_dataset\",\n    \"friendlyName\": \"My Dataset\",\n    \"description\": \"Sample dataset\",\n    \"location\": \"US\",\n    \"creationTime\": \"2024-01-01T00:00:00.000Z\"\n  }\n]"
    }
  ]
}
```

#### `list_tables`
Lists all tables in a specific dataset.

**Parameters:**
- `datasetId` (string, required): The dataset ID to list tables from

**Example:**
```json
{
  "name": "list_tables",
  "arguments": {
    "datasetId": "my_dataset"
  }
}
```

#### `get_table_schema`
Gets the schema of a specific table.

**Parameters:**
- `datasetId` (string, required): The dataset ID containing the table
- `tableId` (string, required): The table ID to get schema for

**Example:**
```json
{
  "name": "get_table_schema",
  "arguments": {
    "datasetId": "my_dataset",
    "tableId": "my_table"
  }
}
```

#### `execute_query`
Executes a BigQuery SQL query.

**Parameters:**
- `query` (string, required): The SQL query to execute
- `maxResults` (number, optional): Maximum number of results to return (default: 100)
- `dryRun` (boolean, optional): If true, only validate the query without executing it (default: false)

**Example:**
```json
{
  "name": "execute_query",
  "arguments": {
    "query": "SELECT * FROM `my_project.my_dataset.my_table` LIMIT 10",
    "maxResults": 10,
    "dryRun": false
  }
}
```

#### `get_query_results`
Gets results from a previously executed query job.

**Parameters:**
- `jobId` (string, required): The job ID of the query to get results for
- `maxResults` (number, optional): Maximum number of results to return (default: 100)

**Example:**
```json
{
  "name": "get_query_results",
  "arguments": {
    "jobId": "job_12345",
    "maxResults": 100
  }
}
```

## Easy Client Switching

To switch between different clients, you have multiple options:

### Method 1: Command Line Argument (Easiest)
```bash
# Client A
node dist/index.js /path/to/client-a-service-account.json

# Client B  
node dist/index.js /path/to/client-b-service-account.json
```

### Method 2: Startup Script
```bash
# Client A
./scripts/start-server.sh /path/to/client-a-service-account.json

# Client B
./scripts/start-server.sh /path/to/client-b-service-account.json
```

### Method 3: Environment Variable
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/client-service-account.json"
npm start
```

No need to remember or configure project IDs separately!

## Example Usage in MCP Client

```javascript
// List all datasets
const datasets = await mcpClient.callTool("list_datasets", {});

// List tables in a dataset
const tables = await mcpClient.callTool("list_tables", {
  datasetId: "my_dataset"
});

// Get table schema
const schema = await mcpClient.callTool("get_table_schema", {
  datasetId: "my_dataset",
  tableId: "my_table"
});

// Execute a query
const results = await mcpClient.callTool("execute_query", {
  query: "SELECT COUNT(*) as total FROM `my_project.my_dataset.my_table`",
  maxResults: 1
});

// Dry run query validation
const validation = await mcpClient.callTool("execute_query", {
  query: "SELECT * FROM `my_project.my_dataset.my_table`",
  dryRun: true
});
```

## Error Handling

The server includes comprehensive error handling:

- **Authentication errors**: Invalid credentials or missing permissions
- **Invalid queries**: SQL syntax errors or invalid table references
- **Rate limiting**: BigQuery API rate limits
- **Network errors**: Connection issues with BigQuery

All errors are returned in the MCP response format with descriptive error messages.

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run built version
npm start
```

## Security Considerations

- **Credentials**: Never commit service account keys to version control
- **Query limits**: The server includes configurable result limits to prevent large data transfers
- **Permissions**: Ensure your BigQuery service account has minimal required permissions
- **Validation**: All inputs are validated using Zod schemas

## Requirements

- Node.js 18+
- Google Cloud BigQuery API access
- Valid Google Cloud authentication

## License

MIT 