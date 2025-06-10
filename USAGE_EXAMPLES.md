# BigQuery MCP Server Usage Examples

## 🚀 **Starting the Server**

### Method 1: Command Line Argument (Recommended for Multi-Client)

The easiest way to switch between different clients:

```bash
# Build the server first
npm run build

# Start with Client A's service account
node dist/index.js /path/to/client-a-service-account.json

# Start with Client B's service account  
node dist/index.js /path/to/client-b-service-account.json

# Start with Client C's service account
node dist/index.js ~/clients/client-c/bigquery-key.json
```

### Method 2: Startup Script

Using the convenience script:

```bash
# Make sure it's executable
chmod +x scripts/start-server.sh

# Start with different clients
./scripts/start-server.sh /path/to/client-a-service-account.json
./scripts/start-server.sh /path/to/client-b-service-account.json
```

### Method 3: Environment Variable

Traditional approach:

```bash
# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Start server
npm start
```

## 🔧 **Cursor Configuration**

### For Command Line Argument Approach

Update your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bigquery-client-a": {
      "command": "node",
      "args": [
        "/Users/dodo/code2/bq/dist/index.js",
        "/path/to/client-a-service-account.json"
      ],
      "env": {
        "BQ_LOCATION": "US"
      }
    },
    "bigquery-client-b": {
      "command": "node", 
      "args": [
        "/Users/dodo/code2/bq/dist/index.js",
        "/path/to/client-b-service-account.json"
      ],
      "env": {
        "BQ_LOCATION": "EU"
      }
    }
  }
}
```

### For Environment Variable Approach

```json
{
  "mcpServers": {
    "bigquery": {
      "command": "node",
      "args": ["/Users/dodo/code2/bq/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json",
        "BQ_LOCATION": "US"
      }
    }
  }
}
```

## 📂 **Organizing Multiple Clients**

Recommended folder structure:

```
~/clients/
├── client-a/
│   ├── bigquery-service-account.json
│   └── notes.md
├── client-b/
│   ├── bigquery-key.json
│   └── project-info.md
└── client-c/
    ├── gcp-service-account.json
    └── config.yaml
```

Then use:

```bash
# Quick switching
node dist/index.js ~/clients/client-a/bigquery-service-account.json
node dist/index.js ~/clients/client-b/bigquery-key.json  
node dist/index.js ~/clients/client-c/gcp-service-account.json
```

## 🧪 **Testing Different Setups**

### Test Server Without Cursor

```bash
# Test with a service account file
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node dist/index.js /path/to/service-account.json

# Should return list of available tools
```

### Test Configuration Priority

The server checks for configuration in this order:

1. **Command line argument** (highest priority)
2. **GOOGLE_APPLICATION_CREDENTIALS** environment variable
3. **GOOGLE_CLOUD_PROJECT** or **BQ_PROJECT_ID** environment variables

### Test Error Handling

```bash
# File doesn't exist
node dist/index.js nonexistent.json

# Invalid JSON file  
echo "invalid json" > test.json
node dist/index.js test.json
rm test.json

# No configuration at all
node dist/index.js
```

## 🔄 **Quick Client Switching Examples**

### Scenario 1: Working with Different Clients

```bash
# Morning: Work on Client A analytics
node dist/index.js ~/clients/acme-corp/bigquery-key.json

# Afternoon: Switch to Client B reporting
node dist/index.js ~/clients/beta-inc/service-account.json

# Evening: Check Client C data
node dist/index.js ~/clients/gamma-llc/gcp-credentials.json
```

### Scenario 2: Different Environments

```bash
# Development environment
node dist/index.js ~/keys/dev-bigquery.json

# Staging environment  
node dist/index.js ~/keys/staging-bigquery.json

# Production environment
node dist/index.js ~/keys/prod-bigquery.json
```

## 💡 **Pro Tips**

1. **Keep service accounts organized**: Use descriptive names and folder structure
2. **Test before switching**: Always verify the service account file works
3. **Use absolute paths**: Avoid relative paths in Cursor configuration
4. **Set appropriate permissions**: Ensure your service accounts have minimal required BigQuery permissions
5. **Multiple servers**: You can run multiple BigQuery MCP servers for different clients simultaneously by using different names in Cursor config

## 🔒 **Security Best Practices**

1. **Never commit service account files** to version control
2. **Use separate service accounts** for each client
3. **Rotate keys regularly** as per your security policy
4. **Monitor access logs** in Google Cloud Console
5. **Use least privilege principle** - only grant necessary BigQuery permissions 