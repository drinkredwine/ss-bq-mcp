# BigQuery MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Google BigQuery. This server allows you to list datasets, inspect table schemas, and execute SQL queries through MCP tools.

## Features

- **List Datasets**: Get all datasets in your BigQuery project
- **List Tables**: Get all tables in a specific dataset
- **Get Table Schema**: Retrieve detailed schema information for any table
- **Execute Queries**: Run SQL queries with optional dry-run validation
- **Query Results**: Retrieve results from previously executed query jobs

## Getting Started

Follow these steps to get the server up and running.

### Prerequisites

*   [Node.js](https://nodejs.org/en/) (v18 or later recommended)
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

## Configuration

The server is configured using environment variables. This is how you provide your Google Cloud credentials and other settings.

### Required Environment Variables
*   `GOOGLE_APPLICATION_CREDENTIALS`: The absolute path to your service account JSON key file. The Google Cloud Project ID will be automatically inferred from this file.

### Optional Environment Variables
*   `BQ_LOCATION`: The BigQuery location/region (e.g., 'US', 'EU'). Defaults to 'US'.
*   `GOOGLE_CLOUD_PROJECT` or `BQ_PROJECT_ID`: Only required if you are *not* using a service account file (e.g., when using Application Default Credentials on Google Cloud).

### How to Set Environment Variables

You can provide these variables in several ways, depending on your use case.

#### 1. MCP Client Configuration (Recommended)
If you are running this server as a tool for an MCP client like Cursor, you should specify the environment variables directly in the client's configuration. This keeps the configuration for each tool self-contained.

*Example for Cursor's `~/.cursor/mcp.json`:*
```json
{
    "tools": {
        "bigquery-superscale": {
            "command": "node",
            "args": [
                "/path/to/your/ss-bq-mcp/dist/index.js"
            ],
            "env": {
                "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your/service-account.json",
                "BQ_LOCATION": "US"
            }
        }
    }
}
```
**Note:** Make sure to use the absolute path to `dist/index.js` and your credentials file.

#### 2. Using a `.env` file (for Standalone Use)
For local development or running the server standalone, you can place a `.env` file in the project root. The server will automatically load variables from it.

1.  Copy the example file:
    ```bash
    cp config.example.env .env
    ```
2.  Edit your `.env` file:
    ```
    GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
    BQ_LOCATION=US
    ```

#### 3. Shell Environment Variables
You can also export the variables in your shell before running the server. This is common for production environments that don't use `.env` files.
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account.json"
npm start
```

### Authentication for Local Development
If you don't want to use a service account for local development, you can use your own user credentials.
1. Install the `gcloud` CLI.
2. Authenticate your user account:
   ```bash
   gcloud auth application-default login
   ```
3. Set the project ID environment variable, since it cannot be inferred without a service account file.
   ```bash
   export GOOGLE_CLOUD_PROJECT="your-project-id"
   ```

## Running the Server

Once configured, you can start the server:
```bash
npm start
```
This will run the compiled server from the `dist/` directory.

For development, you can run the server in watch mode with hot-reloading:
```bash
npm run dev
```

## Usage
For details on the available tools and how to call them from an MCP client, please see `USAGE_EXAMPLES.md`.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
MIT 