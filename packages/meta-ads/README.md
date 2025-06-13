# Meta Ads MCP Server

A Model Context Protocol (MCP) server for Meta Ads (Facebook Ads) API operations.

## Features

- **Account Management**: Get account information and status
- **Campaign Management**: List, view, and analyze campaigns
- **Ad Set Management**: List and manage ad sets within campaigns
- **Ad Management**: List and manage individual ads
- **Performance Insights**: Get detailed performance metrics and analytics

## Environment Variables

Before using this server, you need to set up the following environment variables:

```bash
# Required
META_ADS_ACCESS_TOKEN=your_facebook_access_token
META_ADS_APP_ID=your_facebook_app_id
META_ADS_APP_SECRET=your_facebook_app_secret

# Optional (can be provided per request)
META_ADS_ACCOUNT_ID=your_default_ad_account_id
```

## Getting Started

### Prerequisites

1. A Facebook Developer account
2. A Facebook App with Marketing API permissions
3. A valid access token with ads_read permissions

### Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build
```

### Running the Server

#### Stdio Mode (for MCP clients)
```bash
npm run start:stdio
```

#### HTTP Mode (for testing)
```bash
npm run start:http
# Server will be available at http://localhost:3000
```

#### Development Mode
```bash
npm run dev
# or for HTTP mode
npm run dev:http
```

## Available Tools

### `get_account_info`
Get information about a Meta Ads account.

**Parameters:**
- `accountId` (optional): Account ID to query (uses default if not provided)

### `list_campaigns`
List campaigns in the Meta Ads account.

**Parameters:**
- `accountId` (optional): Account ID to query
- `limit` (optional): Maximum number of campaigns to return (default: 25)
- `status` (optional): Filter by campaign status (ACTIVE, PAUSED, DELETED, ARCHIVED)

### `get_campaign`
Get detailed information about a specific campaign.

**Parameters:**
- `campaignId` (required): The campaign ID to get details for

### `list_adsets`
List ad sets for a campaign.

**Parameters:**
- `campaignId` (required): The campaign ID to list ad sets for
- `limit` (optional): Maximum number of ad sets to return (default: 25)
- `status` (optional): Filter by ad set status

### `list_ads`
List ads for an ad set.

**Parameters:**
- `adSetId` (required): The ad set ID to list ads for
- `limit` (optional): Maximum number of ads to return (default: 25)
- `status` (optional): Filter by ad status

### `get_insights`
Get performance insights for campaigns, ad sets, or ads.

**Parameters:**
- `objectId` (required): The ID of the campaign, ad set, or ad
- `objectType` (required): The type of object (campaign, adset, ad)
- `datePreset` (optional): Date preset (today, yesterday, this_week, last_week, this_month, last_month, lifetime)
- `timeRange` (optional): Custom date range with `since` and `until` dates (YYYY-MM-DD)
- `metrics` (optional): Specific metrics to retrieve

## Example Usage

### Using with MCP Client

```typescript
// List campaigns
const campaigns = await client.callTool("list_campaigns", {
  limit: 10,
  status: "ACTIVE"
});

// Get campaign performance
const insights = await client.callTool("get_insights", {
  objectId: "campaign_id",
  objectType: "campaign",
  datePreset: "last_week"
});
```

### HTTP API Testing

```bash
# Health check
curl http://localhost:3000/health

# List campaigns
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_campaigns",
      "arguments": {"limit": 5}
    },
    "id": 1
  }'
```

## Error Handling

The server includes comprehensive error handling for:
- Missing or invalid authentication credentials
- API rate limiting
- Invalid parameters
- Network connectivity issues

## Development

### Building
```bash
npm run build
```

### Type Checking
```bash
npx tsc --noEmit
```

## License

MIT 