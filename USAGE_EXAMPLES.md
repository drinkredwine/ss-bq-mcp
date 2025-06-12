# BigQuery MCP Server Usage Examples

## 🚀 **Starting the Server**

### Environment Variable Method (Recommended)

The standard way to configure the server:

```bash
# Build the server first
npm run build

# Set environment variable and start
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
npm start
```

### Using a .env file

For local development:

```bash
# Copy the example file
cp config.example.env .env

# Edit your .env file with your credentials
# Then start the server
npm start
```

## 🔧 **Cursor Configuration**

Update your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bigquery": {
      "command": "node",
      "args": ["/path/to/bigquery-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json",
        "BQ_LOCATION": "US"
      }
    }
  }
}
```

### Multiple Projects

For working with multiple BigQuery projects, create separate server instances:

```json
{
  "mcpServers": {
    "bigquery-project-a": {
      "command": "node",
      "args": ["/path/to/bigquery-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/project-a-service-account.json",
        "BQ_LOCATION": "US"
      }
    },
    "bigquery-project-b": {
      "command": "node", 
      "args": ["/path/to/bigquery-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/project-b-service-account.json",
        "BQ_LOCATION": "EU"
      }
    }
  }
}
```

## 🧪 **Testing the Server**

### Test Server Configuration

```bash
# Test with environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | npm start

# Should return list of available tools
```

### Test Different Transport Modes

```bash
# stdio (default)
npm start

# HTTP mode
npm run start:http
```

## 🔄 **Development Workflow**

### Development Mode

```bash
# stdio development
npm run dev

# HTTP development
npm run dev:http
```

### Working with Different Environments

```bash
# Development environment
export GOOGLE_APPLICATION_CREDENTIALS="~/keys/dev-bigquery.json"
npm start

# Production environment  
export GOOGLE_APPLICATION_CREDENTIALS="~/keys/prod-bigquery.json"
npm start
```

## 💡 **Pro Tips**

1. **Keep service accounts organized**: Use descriptive names and folder structure
2. **Test before deploying**: Always verify the service account file works
3. **Use absolute paths**: Avoid relative paths in Cursor configuration
4. **Set appropriate permissions**: Ensure your service accounts have minimal required BigQuery permissions
5. **Multiple servers**: You can run multiple BigQuery MCP servers for different projects simultaneously

## 🔒 **Security Best Practices**

1. **Never commit service account files** to version control
2. **Use separate service accounts** for each project/environment
3. **Rotate keys regularly** as per your security policy
4. **Monitor access logs** in Google Cloud Console
5. **Use least privilege principle** - only grant necessary BigQuery permissions

## 📋 **Available Tools**

- `list_datasets` - List all datasets in your BigQuery project
- `list_tables` - List all tables in a specific dataset  
- `get_table_schema` - Get detailed schema information for a table
- `execute_query` - Execute SQL queries with optional dry-run validation
- `get_query_results` - Retrieve results from previously executed query jobs 