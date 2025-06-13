#!/usr/bin/env node

import { GoogleAdsApi } from "google-ads-api";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { z } from "zod";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootEnvPath = join(__dirname, "../../../.env");
config({ path: rootEnvPath });

interface GoogleAdsConfig {
  customerId?: string;
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

class GoogleAdsMCPServer {
  private googleAds: GoogleAdsApi | null = null;
  private config: GoogleAdsConfig;
  private server: McpServer;

  constructor() {
    // Initialize configuration from environment variables
    this.config = {
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      clientId: process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    };

    // Initialize the MCP server
    this.server = new McpServer(
      {
        name: "google-ads-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeGoogleAds();
    this.setupTools();
  }

  private initializeGoogleAds(): void {
    // Validate required configuration
    const requiredFields = [
      "customerId",
      "developerToken",
      "clientId",
      "clientSecret",
      "refreshToken",
    ];

    const missingFields = requiredFields.filter(
      (field) => !this.config[field as keyof GoogleAdsConfig]
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required Google Ads configuration. Please set the following environment variables:\n` +
          missingFields
            .map(
              (field) =>
                `- GOOGLE_ADS_${field.replace(/([A-Z])/g, "_$1").toUpperCase()}`
            )
            .join("\n") +
          `\n\nYou can create a .env file in the root directory with these variables.`
      );
    }

    // Initialize Google Ads API client
    this.googleAds = new GoogleAdsApi({
      client_id: this.config.clientId!,
      client_secret: this.config.clientSecret!,
      developer_token: this.config.developerToken!,
    });

    console.log(
      `Google Ads API initialized for customer: ${this.config.customerId}`
    );
  }

  private formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === "object") {
      if (error.errors && Array.isArray(error.errors)) {
        return error.errors
          .map((e: any) => e.message || "Unknown error")
          .join("; ");
      }
      if (error.message) {
        return error.message;
      }
    }

    return String(error);
  }

  private setupTools(): void {
    // List accessible customers
    this.server.tool(
      "list_customers",
      "List all accessible Google Ads customers",
      {},
      async () => {
        if (!this.googleAds) {
          throw new Error("Google Ads client not initialized");
        }

        try {
          const customers = await this.googleAds.listAccessibleCustomers(
            this.config.refreshToken!
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(customers, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error listing customers: ${this.formatError(error)}`,
              },
            ],
          };
        }
      }
    );

    // Get customer information
    this.server.tool(
      "get_customer_info",
      "Get detailed information about a specific customer",
      {
        customerId: z
          .string()
          .describe("The customer ID to get information for"),
      },
      async (args: any) => {
        if (!this.googleAds) {
          throw new Error("Google Ads client not initialized");
        }

        try {
          const customer = this.googleAds.Customer({
            customer_id: args.customerId,
            refresh_token: this.config.refreshToken!,
          });

          const customerInfo = await customer.query(`
            SELECT 
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              customer.tracking_url_template,
              customer.auto_tagging_enabled,
              customer.has_partners_badge,
              customer.manager,
              customer.test_account
            FROM customer
            LIMIT 1
          `);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(customerInfo, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error getting customer info: ${this.formatError(error)}`,
              },
            ],
          };
        }
      }
    );

    // List campaigns
    this.server.tool(
      "list_campaigns",
      "List all campaigns for a customer",
      {
        customerId: z
          .string()
          .describe("The customer ID to list campaigns for"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of campaigns to return (default: 50)"),
      },
      async (args: any) => {
        if (!this.googleAds) {
          throw new Error("Google Ads client not initialized");
        }

        // Use default customer ID if not provided (for MCP tool compatibility)
        const customerId = args.customerId || this.config.customerId;

        if (!customerId) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Customer ID is required. Please provide customerId parameter or set GOOGLE_ADS_CUSTOMER_ID environment variable.",
              },
            ],
          };
        }

        try {
          const customer = this.googleAds.Customer({
            customer_id: customerId,
            refresh_token: this.config.refreshToken!,
          });

          const limit = args.limit || 50;
          const campaigns = await customer.query(`
            SELECT 
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.advertising_channel_type,
              campaign.start_date,
              campaign.end_date,
              campaign.serving_status
            FROM campaign
            ORDER BY campaign.name
            LIMIT ${limit}
          `);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(campaigns, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("List campaigns error:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error listing campaigns: ${this.formatError(error)}`,
              },
            ],
          };
        }
      }
    );

    // Get campaign performance
    this.server.tool(
      "get_campaign_performance",
      "Get performance metrics for campaigns",
      {
        customerId: z
          .string()
          .describe("The customer ID to get performance for"),
        campaignIds: z
          .array(z.string())
          .optional()
          .describe("List of campaign IDs (optional)"),
        dateRange: z
          .string()
          .optional()
          .describe(
            "Date range for performance data (e.g., 'LAST_7_DAYS', 'LAST_30_DAYS')"
          ),
      },
      async (args: any) => {
        if (!this.googleAds) {
          throw new Error("Google Ads client not initialized");
        }

        try {
          const customer = this.googleAds.Customer({
            customer_id: args.customerId,
            refresh_token: this.config.refreshToken!,
          });

          const dateRange = args.dateRange || "LAST_7_DAYS";
          let whereClause = "";

          if (args.campaignIds && args.campaignIds.length > 0) {
            const campaignIdList = args.campaignIds
              .map((id: string) => `'${id}'`)
              .join(",");
            whereClause = `WHERE campaign.id IN (${campaignIdList}) AND`;
          } else {
            whereClause = "WHERE";
          }

          const performance = await customer.query(`
            SELECT 
              campaign.id,
              campaign.name,
              campaign.status,
              metrics.impressions,
              metrics.clicks,
              metrics.ctr,
              metrics.average_cpc,
              metrics.cost_micros,
              metrics.conversions,
              metrics.conversion_rate,
              metrics.cost_per_conversion,
              segments.date
            FROM campaign
            ${whereClause} segments.date DURING ${dateRange}
            ORDER BY metrics.cost_micros DESC
            LIMIT 50
          `);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(performance, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error getting campaign performance: ${this.formatError(
                  error
                )}`,
              },
            ],
          };
        }
      }
    );

    // Execute GAQL query
    this.server.tool(
      "execute_gaql_query",
      "Execute a Google Ads Query Language (GAQL) query",
      {
        customerId: z
          .string()
          .describe("The customer ID to execute the query for"),
        query: z.string().describe("The GAQL query to execute"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of results to return (default: 100)"),
      },
      async (args: any) => {
        if (!this.googleAds) {
          throw new Error("Google Ads client not initialized");
        }

        if (!args.query) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Query parameter is required",
              },
            ],
          };
        }

        try {
          const customer = this.googleAds.Customer({
            customer_id: args.customerId,
            refresh_token: this.config.refreshToken!,
          });

          let finalQuery = args.query.trim();
          const limit = args.limit || 100;

          if (!finalQuery.toLowerCase().includes("limit")) {
            finalQuery += ` LIMIT ${limit}`;
          }

          const results = await customer.query(finalQuery);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error executing GAQL query: ${this.formatError(error)}`,
              },
            ],
          };
        }
      }
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Main execution
async function main() {
  try {
    const server = new GoogleAdsMCPServer();
    console.log("Starting google-ads-mcp-server in stdio mode...");
    await server.run();
  } catch (error) {
    console.error("Failed to start Google Ads MCP server:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
