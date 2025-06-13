# Google Ads API Setup Guide

This guide will help you set up authentication for the Google Ads MCP server.

## Prerequisites

1. A Google Ads account with API access
2. A Google Cloud project
3. Basic understanding of OAuth2 flow

## Step 1: Apply for Google Ads API Access

1. Go to the [Google Ads API documentation](https://developers.google.com/google-ads/api/docs/first-call/overview)
2. Apply for API access through your Google Ads account
3. Wait for approval (this can take several days)

## Step 2: Create OAuth2 Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Enable the Google Ads API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Ads API"
   - Click "Enable"

4. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Desktop application" as the application type
   - Give it a name (e.g., "Google Ads MCP Server")
   - Download the JSON file

## Step 3: Get Your Developer Token

1. Sign in to your Google Ads account
2. Go to "Tools & Settings" > "Setup" > "API Center"
3. Apply for a developer token if you haven't already
4. Copy your developer token

## Step 4: Generate Refresh Token

You need to generate a refresh token using the OAuth2 flow. Here's a simple Node.js script to help:

```javascript
// oauth-helper.js
import { google } from 'googleapis';
import readline from 'readline';

const CLIENT_ID = 'your-client-id';
const CLIENT_SECRET = 'your-client-secret';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = ['https://www.googleapis.com/auth/adwords'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token', err);
      return;
    }
    console.log('Refresh token:', token.refresh_token);
  });
});
```

Run this script:
```bash
npm install googleapis
node oauth-helper.js
```

## Step 5: Find Your Customer ID

1. Sign in to your Google Ads account
2. Look at the URL or the account selector
3. Your customer ID is the 10-digit number (without dashes)

## Step 6: Configure Environment Variables

Create a `.env` file or set environment variables:

```bash
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token
```

## Step 7: Test Your Setup

Run the Google Ads MCP server:

```bash
npm run dev:google-ads
```

If everything is configured correctly, the server should start without errors.

## Troubleshooting

### Common Issues

1. **"Developer token not approved"**
   - Your developer token needs to be approved by Google
   - This can take several business days

2. **"Customer not found"**
   - Check that your customer ID is correct (10 digits, no dashes)
   - Ensure the customer ID has API access enabled

3. **"Invalid refresh token"**
   - Regenerate the refresh token using the OAuth2 flow
   - Make sure you're using the correct client ID and secret

4. **"Insufficient permissions"**
   - Ensure your Google Ads account has the necessary permissions
   - Check that the API is enabled in Google Cloud Console

### Testing Individual Components

You can test your authentication setup using the Google Ads API client directly:

```javascript
import { GoogleAdsApi } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: 'your-client-id',
  client_secret: 'your-client-secret',
  developer_token: 'your-developer-token',
});

const customer = client.Customer({
  customer_id: 'your-customer-id',
  refresh_token: 'your-refresh-token',
});

// Test basic connectivity
customer.listAccessibleCustomers()
  .then(customers => console.log('Success:', customers))
  .catch(error => console.error('Error:', error));
```

## Security Notes

- Never commit your credentials to version control
- Use environment variables or secure credential management
- Rotate your refresh tokens periodically
- Monitor API usage in Google Cloud Console

## Resources

- [Google Ads API Documentation](https://developers.google.com/google-ads/api)
- [OAuth2 for Google APIs](https://developers.google.com/identity/protocols/oauth2)
- [Google Ads API Client Library](https://github.com/Opteo/google-ads-api) 