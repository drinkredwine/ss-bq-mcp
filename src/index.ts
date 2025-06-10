#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { BigQuery } from "@google-cloud/bigquery";
import { z } from "zod";
import { readFileSync } from "fs";

// Configuration schema
const ConfigSchema = z.object({
  projectId: z.string(),
  keyFilename: z.string().optional(),
  location: z.string().default("US"),
});

type Config = z.infer<typeof ConfigSchema>;

// Service account key file schema
const ServiceAccountSchema = z.object({
  project_id: z.string(),
  type: z.literal("service_account"),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string(),
  client_id: z.string(),
  auth_uri: z.string(),
  token_uri: z.string(),
});

class BigQueryMCPServer {
  private server: Server;
  private bigquery!: BigQuery;
  private config!: Config;

  constructor() {
    this.server = new Server({
      name: "bigquery-mcp-server",
      version: "1.0.0",
    });

    // Initialize BigQuery client
    this.initializeBigQuery();
    this.setupHandlers();
  }

  private initializeBigQuery() {
    // Get configuration from command line arguments or environment variables
    const commandLineServiceAccount = process.argv[2]; // First argument after script name
    const keyFilename =
      commandLineServiceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const location = process.env.BQ_LOCATION || "US";

    // Try to get project ID from service account file first, then environment variables
    let projectId: string | undefined;

    if (keyFilename) {
      try {
        const serviceAccountContent = readFileSync(keyFilename, "utf8");
        const serviceAccount = ServiceAccountSchema.parse(
          JSON.parse(serviceAccountContent)
        );
        projectId = serviceAccount.project_id;
        console.error(`Using project ID from service account: ${projectId}`);
        console.error(`Service account file: ${keyFilename}`);
      } catch (error) {
        console.error(
          "Warning: Could not read project ID from service account file:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // Fallback to environment variables only if service account doesn't provide project_id
    if (!projectId) {
      projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.BQ_PROJECT_ID;
      if (projectId) {
        console.error(
          `Using project ID from environment variable: ${projectId}`
        );
      }
    }

    if (!projectId) {
      throw new Error(
        "Project ID is required. Either:\n" +
          "1. Pass service account file as argument: node dist/index.js path/to/service-account.json\n" +
          "2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable, or\n" +
          "3. Set GOOGLE_CLOUD_PROJECT or BQ_PROJECT_ID environment variable"
      );
    }

    this.config = ConfigSchema.parse({
      projectId,
      keyFilename,
      location,
    });

    console.error(`[DEBUG] Initialized config:`, {
      projectId: this.config.projectId,
      keyFilename: this.config.keyFilename,
      location: this.config.location,
    });

    const bigqueryOptions: any = {
      projectId: this.config.projectId,
      location: this.config.location,
    };

    if (this.config.keyFilename) {
      bigqueryOptions.keyFilename = this.config.keyFilename;
      console.error(
        `[DEBUG] Using service account file: ${this.config.keyFilename}`
      );
    } else {
      console.error(`[DEBUG] Using default application credentials`);
    }

    console.error(`[DEBUG] BigQuery options:`, bigqueryOptions);
    this.bigquery = new BigQuery(bigqueryOptions);
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "list_datasets",
            description: "List all datasets in the BigQuery project",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: true,
            },
          },
          {
            name: "list_tables",
            description: "List all tables in a specific dataset",
            inputSchema: {
              type: "object",
              properties: {
                datasetId: {
                  type: "string",
                  description: "The dataset ID to list tables from",
                },
              },
              required: ["datasetId"],
              additionalProperties: false,
            },
          },
          {
            name: "get_table_schema",
            description: "Get the schema of a specific table",
            inputSchema: {
              type: "object",
              properties: {
                datasetId: {
                  type: "string",
                  description: "The dataset ID containing the table",
                },
                tableId: {
                  type: "string",
                  description: "The table ID to get schema for",
                },
              },
              required: ["datasetId", "tableId"],
              additionalProperties: false,
            },
          },
          {
            name: "execute_query",
            description: "Execute a BigQuery SQL query",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The SQL query to execute",
                },
                maxResults: {
                  type: "number",
                  description:
                    "Maximum number of results to return (default: 100)",
                  default: 100,
                },
                dryRun: {
                  type: "boolean",
                  description:
                    "If true, only validate the query without executing it",
                  default: false,
                },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
          {
            name: "get_query_results",
            description: "Get results from a previously executed query job",
            inputSchema: {
              type: "object",
              properties: {
                jobId: {
                  type: "string",
                  description: "The job ID of the query to get results for",
                },
                maxResults: {
                  type: "number",
                  description:
                    "Maximum number of results to return (default: 100)",
                  default: 100,
                },
              },
              required: ["jobId"],
              additionalProperties: false,
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "list_datasets":
            return await this.listDatasets();

          case "list_tables":
            return await this.listTables(args?.datasetId as string);

          case "get_table_schema":
            return await this.getTableSchema(
              args?.datasetId as string,
              args?.tableId as string
            );

          case "execute_query":
            return await this.executeQuery(
              args?.query as string,
              (args?.maxResults as number) || 100,
              (args?.dryRun as boolean) || false
            );

          case "get_query_results":
            return await this.getQueryResults(
              args?.jobId as string,
              (args?.maxResults as number) || 100
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async listDatasets() {
    try {
      console.error(
        `[DEBUG] Attempting to list datasets with project: ${this.config.projectId}`
      );
      console.error(
        `[DEBUG] Using credentials: ${this.config.keyFilename || "default"}`
      );
      console.error(`[DEBUG] Location: ${this.config.location}`);
      console.error(
        `[DEBUG] BigQuery client project: ${this.bigquery.projectId}`
      );

      const [datasets] = await this.bigquery.getDatasets();
      console.error(
        `[DEBUG] Successfully retrieved ${datasets.length} datasets`
      );

      const datasetList = datasets.map((dataset) => ({
        id: dataset.id,
        friendlyName: dataset.metadata?.friendlyName,
        description: dataset.metadata?.description,
        location: dataset.metadata?.location,
        creationTime: dataset.metadata?.creationTime,
        lastModifiedTime: dataset.metadata?.lastModifiedTime,
      }));

      return {
        content: [
          {
            type: "text",
            text: `Project: ${
              this.config.projectId
            }\nBigQuery Client Project: ${
              this.bigquery.projectId
            }\nCredentials: ${this.config.keyFilename || "default"}\n\nFound ${
              datasetList.length
            } datasets:\n\n${JSON.stringify(datasetList, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      console.error(`[ERROR] Failed to list datasets:`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing datasets for project ${
              this.config.projectId
            } (BigQuery client: ${this.bigquery.projectId}):\n${
              error instanceof Error ? error.message : String(error)
            }\n\nCredentials: ${this.config.keyFilename || "default"}`,
          },
        ],
      };
    }
  }

  private async listTables(datasetId: string) {
    if (!datasetId) {
      throw new Error("datasetId is required");
    }

    const dataset = this.bigquery.dataset(datasetId);
    const [tables] = await dataset.getTables();

    const tableList = tables.map((table) => ({
      id: table.id,
      friendlyName: table.metadata?.friendlyName,
      description: table.metadata?.description,
      type: table.metadata?.type,
      creationTime: table.metadata?.creationTime,
      lastModifiedTime: table.metadata?.lastModifiedTime,
      numRows: table.metadata?.numRows,
      numBytes: table.metadata?.numBytes,
    }));

    return {
      content: [
        {
          type: "text",
          text: `Found ${
            tableList.length
          } tables in dataset '${datasetId}':\n\n${JSON.stringify(
            tableList,
            null,
            2
          )}`,
        },
      ],
    };
  }

  private async getTableSchema(datasetId: string, tableId: string) {
    if (!datasetId) {
      throw new Error("datasetId is required");
    }
    if (!tableId) {
      throw new Error("tableId is required");
    }

    const table = this.bigquery.dataset(datasetId).table(tableId);
    const [metadata] = await table.getMetadata();

    const schema = {
      tableId: metadata.id,
      friendlyName: metadata.friendlyName,
      description: metadata.description,
      type: metadata.type,
      schema: metadata.schema,
      numRows: metadata.numRows,
      numBytes: metadata.numBytes,
      creationTime: metadata.creationTime,
      lastModifiedTime: metadata.lastModifiedTime,
      location: metadata.location,
    };

    return {
      content: [
        {
          type: "text",
          text: `Schema for table '${datasetId}.${tableId}':\n\n${JSON.stringify(
            schema,
            null,
            2
          )}`,
        },
      ],
    };
  }

  private async executeQuery(
    query: string,
    maxResults: number = 100,
    dryRun: boolean = false
  ) {
    if (!query) {
      throw new Error("query is required");
    }

    const options = {
      query,
      location: this.config.location,
      maxResults,
      dryRun,
    };

    if (dryRun) {
      // For dry run, just validate the query
      const [job] = await this.bigquery.createQueryJob(options);
      const [metadata] = await job.getMetadata();

      return {
        content: [
          {
            type: "text",
            text: `Query validation successful. Estimated bytes processed: ${
              metadata.statistics?.query?.totalBytesProcessed || "unknown"
            }`,
          },
        ],
      };
    }

    const [job] = await this.bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults({ maxResults });

    const result = {
      jobId: job.id,
      totalRows: job.metadata?.statistics?.query?.totalBytesProcessed,
      bytesProcessed: job.metadata?.statistics?.query?.totalBytesProcessed,
      cacheHit: job.metadata?.statistics?.query?.cacheHit,
      rows: rows,
      rowCount: rows.length,
    };

    return {
      content: [
        {
          type: "text",
          text: `Query executed successfully. Job ID: ${job.id}\n\nResults (${
            rows.length
          } rows):\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async getQueryResults(jobId: string, maxResults: number = 100) {
    if (!jobId) {
      throw new Error("jobId is required");
    }

    const job = this.bigquery.job(jobId);
    const [rows] = await job.getQueryResults({ maxResults });
    const [metadata] = await job.getMetadata();

    const result = {
      jobId: job.id,
      state: metadata.status?.state,
      totalRows: metadata.statistics?.query?.totalBytesProcessed,
      bytesProcessed: metadata.statistics?.query?.totalBytesProcessed,
      cacheHit: metadata.statistics?.query?.cacheHit,
      rows: rows,
      rowCount: rows.length,
    };

    return {
      content: [
        {
          type: "text",
          text: `Query results for job ${jobId} (${
            rows.length
          } rows):\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("BigQuery MCP server running on stdio");
  }
}

// Run the server
const server = new BigQueryMCPServer();
server.run().catch(console.error);
