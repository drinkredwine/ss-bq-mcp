#!/usr/bin/env node

import {
  FacebookAdsApi,
  AdAccount,
  Campaign,
  AdSet,
  Ad,
} from "facebook-nodejs-business-sdk";
import { z } from "zod";
import { BaseMCPServer } from "../../shared/dist/index.js";

interface MetaAdsConfig {
  accessToken?: string;
  appId?: string;
  appSecret?: string;
  accountId?: string;
}

class MetaAdsMCPServer extends BaseMCPServer {
  private api: FacebookAdsApi | null = null;
  private adsConfig: MetaAdsConfig = {};

  constructor() {
    super({
      name: "meta-ads-mcp-server",
      version: "1.0.0",
      description: "MCP server for Meta Ads (Facebook Ads) API operations",
    });
  }

  protected initialize(): void {
    try {
      this.initializeMetaAds();
    } catch (error) {
      console.error(`[ERROR] Failed to initialize Meta Ads:`, error);
      throw error;
    }
  }

  private initializeMetaAds(): void {
    this.adsConfig = {
      accessToken: process.env.META_ADS_ACCESS_TOKEN,
      appId: process.env.META_ADS_APP_ID,
      appSecret: process.env.META_ADS_APP_SECRET,
      accountId: process.env.META_ADS_ACCOUNT_ID,
    };

    const requiredFields = ["accessToken", "appId", "appSecret"];
    const missingFields = requiredFields.filter(
      (field) => !this.adsConfig[field as keyof MetaAdsConfig]
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required Meta Ads configuration. Please set the following environment variables:\n` +
          missingFields
            .map(
              (field) =>
                `- META_ADS_${field.replace(/([A-Z])/g, "_$1").toUpperCase()}`
            )
            .join("\n")
      );
    }

    FacebookAdsApi.init(this.adsConfig.accessToken!);
    this.api = FacebookAdsApi.getDefaultApi();
  }

  protected setupTools(): void {
    // Get account information
    this.server.tool(
      "get_account_info",
      "Get information about the Meta Ads account",
      {
        accountId: z
          .string()
          .optional()
          .describe("Account ID (uses default if not provided)"),
      },
      async (args) => {
        // Re-initialize if needed
        if (!this.api) {
          this.initializeMetaAds();
        }

        try {
          const accountId = args.accountId || this.adsConfig.accountId;
          if (!accountId) {
            throw new Error(
              "No account ID provided and no default account ID configured"
            );
          }

          const account = new AdAccount(`act_${accountId}`);
          const accountInfo = await account.read([
            AdAccount.Fields.id,
            AdAccount.Fields.name,
            AdAccount.Fields.account_status,
            AdAccount.Fields.currency,
            AdAccount.Fields.timezone_name,
            AdAccount.Fields.spend_cap,
            AdAccount.Fields.amount_spent,
            AdAccount.Fields.balance,
          ]);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(accountInfo, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error getting account info: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // List campaigns
    this.server.tool(
      "list_campaigns",
      "List campaigns in the Meta Ads account",
      {
        accountId: z
          .string()
          .optional()
          .describe("Account ID (uses default if not provided)"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of campaigns to return (default: 25)"),
        status: z
          .enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"])
          .optional()
          .describe("Filter by campaign status"),
      },
      async (args) => {
        if (!this.api) {
          throw new Error("Meta Ads API not initialized");
        }

        try {
          const accountId = args.accountId || this.adsConfig.accountId;
          if (!accountId) {
            throw new Error(
              "No account ID provided and no default account ID configured"
            );
          }

          const account = new AdAccount(`act_${accountId}`);
          const params: any = {
            limit: args.limit || 25,
          };

          if (args.status) {
            params.filtering = [
              {
                field: "status",
                operator: "IN",
                value: [args.status],
              },
            ];
          }

          const campaigns = await account.getCampaigns(
            [
              Campaign.Fields.id,
              Campaign.Fields.name,
              Campaign.Fields.status,
              Campaign.Fields.objective,
              Campaign.Fields.created_time,
              Campaign.Fields.updated_time,
              Campaign.Fields.start_time,
              Campaign.Fields.stop_time,
              Campaign.Fields.daily_budget,
              Campaign.Fields.lifetime_budget,
              Campaign.Fields.budget_remaining,
              Campaign.Fields.spend_cap,
            ],
            params
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(campaigns, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error listing campaigns: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // Get campaign details
    this.server.tool(
      "get_campaign",
      "Get detailed information about a specific campaign",
      {
        campaignId: z.string().describe("The campaign ID to get details for"),
      },
      async (args) => {
        if (!this.api) {
          throw new Error("Meta Ads API not initialized");
        }

        try {
          const campaign = new Campaign(args.campaignId);
          const campaignData = await campaign.read([
            Campaign.Fields.id,
            Campaign.Fields.name,
            Campaign.Fields.status,
            Campaign.Fields.objective,
            Campaign.Fields.created_time,
            Campaign.Fields.updated_time,
            Campaign.Fields.start_time,
            Campaign.Fields.stop_time,
            Campaign.Fields.daily_budget,
            Campaign.Fields.lifetime_budget,
            Campaign.Fields.budget_remaining,
            Campaign.Fields.spend_cap,
            Campaign.Fields.bid_strategy,
            Campaign.Fields.buying_type,
            Campaign.Fields.can_use_spend_cap,
          ]);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(campaignData, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error getting campaign: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // List ad sets
    this.server.tool(
      "list_adsets",
      "List ad sets for a campaign",
      {
        campaignId: z.string().describe("The campaign ID to list ad sets for"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of ad sets to return (default: 25)"),
        status: z
          .enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"])
          .optional()
          .describe("Filter by ad set status"),
      },
      async (args) => {
        if (!this.api) {
          throw new Error("Meta Ads API not initialized");
        }

        try {
          const campaign = new Campaign(args.campaignId);
          const params: any = {
            limit: args.limit || 25,
          };

          if (args.status) {
            params.filtering = [
              {
                field: "status",
                operator: "IN",
                value: [args.status],
              },
            ];
          }

          const adSets = await campaign.getAdSets(
            [
              AdSet.Fields.id,
              AdSet.Fields.name,
              AdSet.Fields.status,
              AdSet.Fields.created_time,
              AdSet.Fields.updated_time,
              AdSet.Fields.start_time,
              AdSet.Fields.end_time,
              AdSet.Fields.daily_budget,
              AdSet.Fields.lifetime_budget,
              AdSet.Fields.budget_remaining,
              AdSet.Fields.bid_amount,
              AdSet.Fields.billing_event,
              AdSet.Fields.optimization_goal,
            ],
            params
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(adSets, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error listing ad sets: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // List ads
    this.server.tool(
      "list_ads",
      "List ads for an ad set",
      {
        adSetId: z.string().describe("The ad set ID to list ads for"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of ads to return (default: 25)"),
        status: z
          .enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"])
          .optional()
          .describe("Filter by ad status"),
      },
      async (args) => {
        if (!this.api) {
          throw new Error("Meta Ads API not initialized");
        }

        try {
          const adSet = new AdSet(args.adSetId);
          const params: any = {
            limit: args.limit || 25,
          };

          if (args.status) {
            params.filtering = [
              {
                field: "status",
                operator: "IN",
                value: [args.status],
              },
            ];
          }

          const ads = await adSet.getAds(
            [
              Ad.Fields.id,
              Ad.Fields.name,
              Ad.Fields.status,
              Ad.Fields.created_time,
              Ad.Fields.updated_time,
              Ad.Fields.creative,
              Ad.Fields.tracking_specs,
              Ad.Fields.conversion_specs,
            ],
            params
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(ads, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error listing ads: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // Get insights/performance data
    this.server.tool(
      "get_insights",
      "Get performance insights for campaigns, ad sets, or ads",
      {
        objectId: z
          .string()
          .describe(
            "The ID of the campaign, ad set, or ad to get insights for"
          ),
        objectType: z
          .enum(["campaign", "adset", "ad"])
          .describe("The type of object to get insights for"),
        datePreset: z
          .enum([
            "today",
            "yesterday",
            "this_week",
            "last_week",
            "this_month",
            "last_month",
            "lifetime",
          ])
          .optional()
          .describe("Date preset for the insights"),
        timeRange: z
          .object({
            since: z.string().describe("Start date (YYYY-MM-DD)"),
            until: z.string().describe("End date (YYYY-MM-DD)"),
          })
          .optional()
          .describe("Custom date range (alternative to datePreset)"),
        metrics: z
          .array(z.string())
          .optional()
          .describe("Specific metrics to retrieve"),
      },
      async (args) => {
        if (!this.api) {
          throw new Error("Meta Ads API not initialized");
        }

        try {
          let object: Campaign | AdSet | Ad;

          switch (args.objectType) {
            case "campaign":
              object = new Campaign(args.objectId);
              break;
            case "adset":
              object = new AdSet(args.objectId);
              break;
            case "ad":
              object = new Ad(args.objectId);
              break;
            default:
              throw new Error("Invalid object type");
          }

          const params: any = {};

          if (args.datePreset) {
            params.date_preset = args.datePreset;
          } else if (args.timeRange) {
            params.time_range = args.timeRange;
          } else {
            params.date_preset = "lifetime";
          }

          const defaultMetrics = [
            "impressions",
            "clicks",
            "spend",
            "reach",
            "frequency",
            "cpm",
            "cpc",
            "ctr",
            "cost_per_result",
            "results",
          ];

          const insights = await object.getInsights(
            args.metrics || defaultMetrics,
            params
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(insights, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error getting insights: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );
  }

  protected async handleToolsList(request: any): Promise<any> {
    const tools = [
      {
        name: "get_account_info",
        description: "Get information about the Meta Ads account",
        inputSchema: {
          type: "object",
          properties: {
            accountId: {
              type: "string",
              description: "Account ID (uses default if not provided)",
            },
          },
        },
      },
      {
        name: "list_campaigns",
        description: "List campaigns in the Meta Ads account",
        inputSchema: {
          type: "object",
          properties: {
            accountId: {
              type: "string",
              description: "Account ID (uses default if not provided)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of campaigns to return (default: 25)",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"],
              description: "Filter by campaign status",
            },
          },
        },
      },
      {
        name: "get_campaign",
        description: "Get detailed information about a specific campaign",
        inputSchema: {
          type: "object",
          properties: {
            campaignId: {
              type: "string",
              description: "The campaign ID to get details for",
            },
          },
          required: ["campaignId"],
        },
      },
      {
        name: "list_adsets",
        description: "List ad sets for a campaign",
        inputSchema: {
          type: "object",
          properties: {
            campaignId: {
              type: "string",
              description: "The campaign ID to list ad sets for",
            },
            limit: {
              type: "number",
              description: "Maximum number of ad sets to return (default: 25)",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"],
              description: "Filter by ad set status",
            },
          },
          required: ["campaignId"],
        },
      },
      {
        name: "list_ads",
        description: "List ads for an ad set",
        inputSchema: {
          type: "object",
          properties: {
            adSetId: {
              type: "string",
              description: "The ad set ID to list ads for",
            },
            limit: {
              type: "number",
              description: "Maximum number of ads to return (default: 25)",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"],
              description: "Filter by ad status",
            },
          },
          required: ["adSetId"],
        },
      },
      {
        name: "get_insights",
        description: "Get performance insights for campaigns, ad sets, or ads",
        inputSchema: {
          type: "object",
          properties: {
            objectId: {
              type: "string",
              description:
                "The ID of the campaign, ad set, or ad to get insights for",
            },
            objectType: {
              type: "string",
              enum: ["campaign", "adset", "ad"],
              description: "The type of object to get insights for",
            },
            datePreset: {
              type: "string",
              enum: [
                "today",
                "yesterday",
                "this_week",
                "last_week",
                "this_month",
                "last_month",
                "lifetime",
              ],
              description: "Date preset for the insights",
            },
            timeRange: {
              type: "object",
              properties: {
                since: {
                  type: "string",
                  description: "Start date (YYYY-MM-DD)",
                },
                until: {
                  type: "string",
                  description: "End date (YYYY-MM-DD)",
                },
              },
              description: "Custom date range (alternative to datePreset)",
            },
            metrics: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Specific metrics to retrieve",
            },
          },
          required: ["objectId", "objectType"],
        },
      },
    ];

    return {
      jsonrpc: "2.0",
      result: { tools },
      id: request.id,
    };
  }

  protected async handleToolCall(request: any): Promise<any> {
    const toolName = request.params?.name;
    const toolArgs = request.params?.arguments || {};

    try {
      let toolResult: any;

      switch (toolName) {
        case "get_account_info":
          if (!this.api) {
            throw new Error("Meta Ads API not initialized");
          }
          const accountId = toolArgs.accountId || this.adsConfig.accountId;
          if (!accountId) {
            throw new Error(
              "No account ID provided and no default account ID configured"
            );
          }
          const account = new AdAccount(`act_${accountId}`);
          const accountInfo = await account.read([
            AdAccount.Fields.id,
            AdAccount.Fields.name,
            AdAccount.Fields.account_status,
            AdAccount.Fields.currency,
            AdAccount.Fields.timezone_name,
            AdAccount.Fields.spend_cap,
            AdAccount.Fields.amount_spent,
            AdAccount.Fields.balance,
          ]);
          toolResult = {
            content: [
              {
                type: "text",
                text: JSON.stringify(accountInfo, null, 2),
              },
            ],
          };
          break;

        case "list_campaigns":
          if (!this.api) {
            throw new Error("Meta Ads API not initialized");
          }
          const campaignAccountId =
            toolArgs.accountId || this.adsConfig.accountId;
          if (!campaignAccountId) {
            throw new Error(
              "No account ID provided and no default account ID configured"
            );
          }
          const campaignAccount = new AdAccount(`act_${campaignAccountId}`);
          const campaignParams: any = {
            limit: toolArgs.limit || 25,
          };
          if (toolArgs.status) {
            campaignParams.filtering = [
              {
                field: "status",
                operator: "IN",
                value: [toolArgs.status],
              },
            ];
          }
          const campaigns = await campaignAccount.getCampaigns(
            [
              Campaign.Fields.id,
              Campaign.Fields.name,
              Campaign.Fields.status,
              Campaign.Fields.objective,
              Campaign.Fields.created_time,
              Campaign.Fields.updated_time,
              Campaign.Fields.start_time,
              Campaign.Fields.stop_time,
              Campaign.Fields.daily_budget,
              Campaign.Fields.lifetime_budget,
              Campaign.Fields.budget_remaining,
              Campaign.Fields.spend_cap,
            ],
            campaignParams
          );
          toolResult = {
            content: [
              {
                type: "text",
                text: JSON.stringify(campaigns, null, 2),
              },
            ],
          };
          break;

        case "get_campaign":
          if (!this.api) {
            throw new Error("Meta Ads API not initialized");
          }
          const campaign = new Campaign(toolArgs.campaignId);
          const campaignData = await campaign.read([
            Campaign.Fields.id,
            Campaign.Fields.name,
            Campaign.Fields.status,
            Campaign.Fields.objective,
            Campaign.Fields.created_time,
            Campaign.Fields.updated_time,
            Campaign.Fields.start_time,
            Campaign.Fields.stop_time,
            Campaign.Fields.daily_budget,
            Campaign.Fields.lifetime_budget,
            Campaign.Fields.budget_remaining,
            Campaign.Fields.spend_cap,
            Campaign.Fields.bid_strategy,
            Campaign.Fields.buying_type,
            Campaign.Fields.can_use_spend_cap,
          ]);
          toolResult = {
            content: [
              {
                type: "text",
                text: JSON.stringify(campaignData, null, 2),
              },
            ],
          };
          break;

        case "list_adsets":
          if (!this.api) {
            throw new Error("Meta Ads API not initialized");
          }
          const adsetCampaign = new Campaign(toolArgs.campaignId);
          const adsetParams: any = {
            limit: toolArgs.limit || 25,
          };
          if (toolArgs.status) {
            adsetParams.filtering = [
              {
                field: "status",
                operator: "IN",
                value: [toolArgs.status],
              },
            ];
          }
          const adSets = await adsetCampaign.getAdSets(
            [
              AdSet.Fields.id,
              AdSet.Fields.name,
              AdSet.Fields.status,
              AdSet.Fields.created_time,
              AdSet.Fields.updated_time,
              AdSet.Fields.start_time,
              AdSet.Fields.end_time,
              AdSet.Fields.daily_budget,
              AdSet.Fields.lifetime_budget,
              AdSet.Fields.budget_remaining,
              AdSet.Fields.bid_amount,
              AdSet.Fields.billing_event,
              AdSet.Fields.optimization_goal,
            ],
            adsetParams
          );
          toolResult = {
            content: [
              {
                type: "text",
                text: JSON.stringify(adSets, null, 2),
              },
            ],
          };
          break;

        case "list_ads":
          if (!this.api) {
            throw new Error("Meta Ads API not initialized");
          }
          const adSet = new AdSet(toolArgs.adSetId);
          const adParams: any = {
            limit: toolArgs.limit || 25,
          };
          if (toolArgs.status) {
            adParams.filtering = [
              {
                field: "status",
                operator: "IN",
                value: [toolArgs.status],
              },
            ];
          }
          const ads = await adSet.getAds(
            [
              Ad.Fields.id,
              Ad.Fields.name,
              Ad.Fields.status,
              Ad.Fields.created_time,
              Ad.Fields.updated_time,
              Ad.Fields.creative,
              Ad.Fields.tracking_specs,
              Ad.Fields.conversion_specs,
            ],
            adParams
          );
          toolResult = {
            content: [
              {
                type: "text",
                text: JSON.stringify(ads, null, 2),
              },
            ],
          };
          break;

        case "get_insights":
          if (!this.api) {
            throw new Error("Meta Ads API not initialized");
          }
          let object: Campaign | AdSet | Ad;
          switch (toolArgs.objectType) {
            case "campaign":
              object = new Campaign(toolArgs.objectId);
              break;
            case "adset":
              object = new AdSet(toolArgs.objectId);
              break;
            case "ad":
              object = new Ad(toolArgs.objectId);
              break;
            default:
              throw new Error("Invalid object type");
          }
          const insightParams: any = {};
          if (toolArgs.datePreset) {
            insightParams.date_preset = toolArgs.datePreset;
          } else if (toolArgs.timeRange) {
            insightParams.time_range = toolArgs.timeRange;
          } else {
            insightParams.date_preset = "lifetime";
          }
          const defaultMetrics = [
            "impressions",
            "clicks",
            "spend",
            "reach",
            "frequency",
            "cpm",
            "cpc",
            "ctr",
            "cost_per_result",
            "results",
          ];
          const insights = await object.getInsights(
            toolArgs.metrics || defaultMetrics,
            insightParams
          );
          toolResult = {
            content: [
              {
                type: "text",
                text: JSON.stringify(insights, null, 2),
              },
            ],
          };
          break;

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      return {
        jsonrpc: "2.0",
        result: toolResult,
        id: request.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        jsonrpc: "2.0",
        error: { code: -32000, message: errorMessage },
        id: request.id,
      };
    }
  }
}

async function main() {
  const server = new MetaAdsMCPServer();
  await server.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { MetaAdsMCPServer };
