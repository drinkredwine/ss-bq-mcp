#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { BigQuery } from "@google-cloud/bigquery";
import { z } from "zod";
import { readFileSync } from "fs";
import express from "express";
import cors from "cors";
import http from "http";

// Configuration interface
interface BigQueryConfig {
  projectId?: string;
  keyFilename?: string;
  location: string;
}

class BigQueryMCPServer {
  private bigquery: BigQuery | null = null;
  private config: BigQueryConfig;
  private server: McpServer;

  constructor() {
    this.config = {
      location: "US",
    };

    // Initialize the MCP server with proper capabilities
    this.server = new McpServer(
      {
        name: "bigquery-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeBigQuery();
    this.setupTools();
  }

  private initializeBigQuery(): void {
    try {
      // Get credentials from environment variables
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (serviceAccountPath) {
        try {
          const serviceAccount = JSON.parse(
            readFileSync(serviceAccountPath, "utf8")
          );
          this.config.projectId = serviceAccount.project_id;
          this.config.keyFilename = serviceAccountPath;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Could not read service account file: ${errorMessage}`
          );
        }
      }

      // Try other environment variables for project ID
      if (!this.config.projectId) {
        this.config.projectId =
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.BQ_PROJECT_ID ||
          process.env.GCLOUD_PROJECT;
      }

      if (!this.config.projectId) {
        throw new Error(
          "Project ID is required. Either:\n" +
            "1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable, or\n" +
            "2. Set GOOGLE_CLOUD_PROJECT or BQ_PROJECT_ID environment variable"
        );
      }

      // Initialize BigQuery client
      const bigqueryOptions: any = {
        projectId: this.config.projectId,
        location: this.config.location,
      };

      if (this.config.keyFilename) {
        bigqueryOptions.keyFilename = this.config.keyFilename;
      }

      this.bigquery = new BigQuery(bigqueryOptions);
    } catch (error) {
      console.error(`[ERROR] Failed to initialize BigQuery:`, error);
      throw error;
    }
  }

  private getTransportMode(): string {
    const args = process.argv.slice(2);
    const transportArg = args.find((arg) => arg.startsWith("--transport"));

    if (transportArg) {
      if (transportArg.includes("=")) {
        return transportArg.split("=")[1];
      } else {
        const index = args.indexOf(transportArg);
        return args[index + 1] || "stdio";
      }
    }

    // Check if we're being called with HTTP-specific arguments
    if (args.some((arg) => arg.startsWith("--port") || arg === "http")) {
      return "http";
    }

    return "stdio";
  }

  private getPort(): number {
    const args = process.argv.slice(2);
    const portArg = args.find((arg) => arg.startsWith("--port"));

    if (portArg) {
      if (portArg.includes("=")) {
        return parseInt(portArg.split("=")[1]) || 3000;
      } else {
        const index = args.indexOf(portArg);
        return parseInt(args[index + 1]) || 3000;
      }
    }

    return 3000;
  }

  private setupTools(): void {
    // List datasets tool
    this.server.tool(
      "list_datasets",
      "List all datasets in the BigQuery project",
      {},
      async () => {
        if (!this.bigquery) {
          return {
            content: [
              {
                type: "text",
                text: "Error: BigQuery client not initialized",
              },
            ],
          };
        }

        try {
          const [datasets] = await this.bigquery.getDatasets();
          const datasetList = datasets.map((dataset) => ({
            id: dataset.id,
            friendlyName: dataset.metadata?.friendlyName || null,
            description: dataset.metadata?.description || null,
            location: dataset.metadata?.location || null,
            creationTime: dataset.metadata?.creationTime || null,
          }));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(datasetList, null, 2),
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
                text: `Error listing datasets: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // List tables tool
    this.server.tool(
      "list_tables",
      "List all tables in a specific dataset",
      {
        datasetId: z.string().describe("The dataset ID to list tables from"),
      },
      async (args) => {
        if (!this.bigquery) {
          throw new Error("BigQuery client not initialized");
        }

        const { datasetId } = args;

        try {
          const dataset = this.bigquery.dataset(datasetId);
          const [tables] = await dataset.getTables();

          const tableList = tables.map((table) => ({
            id: table.id,
            friendlyName: table.metadata?.friendlyName || null,
            description: table.metadata?.description || null,
            type: table.metadata?.type || null,
            numRows: table.metadata?.numRows || null,
            numBytes: table.metadata?.numBytes || null,
            creationTime: table.metadata?.creationTime || null,
            lastModifiedTime: table.metadata?.lastModifiedTime || null,
          }));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(tableList, null, 2),
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
                text: `Error listing tables in dataset ${datasetId}: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // Get table schema tool
    this.server.tool(
      "get_table_schema",
      "Get the schema of a specific table",
      {
        datasetId: z.string().describe("The dataset ID containing the table"),
        tableId: z.string().describe("The table ID to get schema for"),
      },
      async (args) => {
        if (!this.bigquery) {
          throw new Error("BigQuery client not initialized");
        }

        const { datasetId, tableId } = args;

        try {
          const table = this.bigquery.dataset(datasetId).table(tableId);
          const [metadata] = await table.getMetadata();

          const schema = {
            tableId: tableId,
            datasetId: datasetId,
            schema: metadata.schema,
            numRows: metadata.numRows,
            numBytes: metadata.numBytes,
            creationTime: metadata.creationTime,
            lastModifiedTime: metadata.lastModifiedTime,
            friendlyName: metadata.friendlyName,
            description: metadata.description,
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(schema, null, 2),
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
                text: `Error getting schema for table ${datasetId}.${tableId}: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // Execute query tool
    this.server.tool(
      "execute_query",
      "Execute a BigQuery SQL query",
      {
        query: z.string().describe("The SQL query to execute"),
        dryRun: z
          .boolean()
          .optional()
          .describe("If true, only validate the query without executing it"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return (default: 100)"),
      },
      async (args) => {
        if (!this.bigquery) {
          throw new Error("BigQuery client not initialized");
        }

        const { query, dryRun = false, maxResults = 100 } = args;

        try {
          const options: any = {
            query: query,
            location: this.config.location,
            dryRun: dryRun,
            maxResults: maxResults,
          };

          const [job] = await this.bigquery.createQueryJob(options);

          if (dryRun) {
            const [metadata] = await job.getMetadata();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      jobId: job.id,
                      valid: true,
                      totalBytesProcessed:
                        metadata.statistics?.query?.totalBytesProcessed || "0",
                      estimatedCost: "Query is valid",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          const [rows] = await job.getQueryResults({ maxResults });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    jobId: job.id,
                    rows: rows,
                    totalRows: rows.length,
                  },
                  null,
                  2
                ),
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
                text: `Error executing query: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );

    // Get query results tool
    this.server.tool(
      "get_query_results",
      "Get results from a previously executed query job",
      {
        jobId: z
          .string()
          .describe("The job ID of the query to get results for"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return (default: 100)"),
      },
      async (args) => {
        if (!this.bigquery) {
          throw new Error("BigQuery client not initialized");
        }

        const { jobId, maxResults = 100 } = args;

        try {
          const job = this.bigquery.job(jobId);
          const [rows] = await job.getQueryResults({ maxResults });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    jobId: jobId,
                    rows: rows,
                    totalRows: rows.length,
                  },
                  null,
                  2
                ),
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
                text: `Error getting query results for job ${jobId}: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );
  }

  async runStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  // HTTP transport for backwards compatibility
  async runHTTP(port: number): Promise<void> {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Simple HTTP endpoint that proxies to the MCP server
    app.post("/mcp", async (req, res) => {
      try {
        // For HTTP mode, we'll need to handle MCP protocol manually
        // This is a simplified implementation
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const request = req.body;
        let response: any;

        switch (request.method) {
          case "initialize":
            response = {
              jsonrpc: "2.0",
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: { listChanged: true },
                },
                serverInfo: {
                  name: "bigquery-mcp-server",
                  version: "1.0.0",
                },
              },
              id: request.id,
            };
            break;

          case "tools/list":
            response = {
              jsonrpc: "2.0",
              result: {
                tools: [
                  {
                    name: "list_datasets",
                    description: "List all datasets in the BigQuery project",
                    inputSchema: {
                      type: "object",
                      properties: {},
                      required: [],
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
                        dryRun: {
                          type: "boolean",
                          description:
                            "If true, only validate the query without executing it",
                        },
                        maxResults: {
                          type: "number",
                          description:
                            "Maximum number of results to return (default: 100)",
                        },
                      },
                      required: ["query"],
                    },
                  },
                  {
                    name: "get_query_results",
                    description:
                      "Get results from a previously executed query job",
                    inputSchema: {
                      type: "object",
                      properties: {
                        jobId: {
                          type: "string",
                          description:
                            "The job ID of the query to get results for",
                        },
                        maxResults: {
                          type: "number",
                          description:
                            "Maximum number of results to return (default: 100)",
                        },
                      },
                      required: ["jobId"],
                    },
                  },
                ],
              },
              id: request.id,
            };
            break;

          case "tools/call":
            const toolName = request.params?.name;
            const toolArgs = request.params?.arguments || {};

            try {
              let toolResult: any;

              switch (toolName) {
                case "list_datasets":
                  if (!this.bigquery) {
                    throw new Error("BigQuery client not initialized");
                  }
                  const [datasets] = await this.bigquery.getDatasets();
                  const datasetList = datasets.map((dataset) => ({
                    id: dataset.id,
                    friendlyName: dataset.metadata?.friendlyName || null,
                    description: dataset.metadata?.description || null,
                    location: dataset.metadata?.location || null,
                    creationTime: dataset.metadata?.creationTime || null,
                  }));
                  toolResult = {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(datasetList, null, 2),
                      },
                    ],
                  };
                  break;

                case "list_tables":
                  if (!this.bigquery) {
                    throw new Error("BigQuery client not initialized");
                  }
                  const { datasetId } = toolArgs;
                  const dataset = this.bigquery.dataset(datasetId);
                  const [tables] = await dataset.getTables();
                  const tableList = tables.map((table) => ({
                    id: table.id,
                    friendlyName: table.metadata?.friendlyName || null,
                    description: table.metadata?.description || null,
                    type: table.metadata?.type || null,
                    numRows: table.metadata?.numRows || null,
                    numBytes: table.metadata?.numBytes || null,
                    creationTime: table.metadata?.creationTime || null,
                    lastModifiedTime: table.metadata?.lastModifiedTime || null,
                  }));
                  toolResult = {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(tableList, null, 2),
                      },
                    ],
                  };
                  break;

                case "get_table_schema":
                  if (!this.bigquery) {
                    throw new Error("BigQuery client not initialized");
                  }
                  const { datasetId: schemaDatasetId, tableId } = toolArgs;
                  const table = this.bigquery
                    .dataset(schemaDatasetId)
                    .table(tableId);
                  const [metadata] = await table.getMetadata();
                  const schema = {
                    tableId: tableId,
                    datasetId: schemaDatasetId,
                    schema: metadata.schema,
                    numRows: metadata.numRows,
                    numBytes: metadata.numBytes,
                    creationTime: metadata.creationTime,
                    lastModifiedTime: metadata.lastModifiedTime,
                    friendlyName: metadata.friendlyName,
                    description: metadata.description,
                  };
                  toolResult = {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(schema, null, 2),
                      },
                    ],
                  };
                  break;

                case "execute_query":
                  if (!this.bigquery) {
                    throw new Error("BigQuery client not initialized");
                  }
                  const { query, dryRun = false, maxResults = 100 } = toolArgs;
                  const options: any = {
                    query: query,
                    location: this.config.location,
                    dryRun: dryRun,
                    maxResults: maxResults,
                  };
                  const [job] = await this.bigquery.createQueryJob(options);

                  if (dryRun) {
                    const [jobMetadata] = await job.getMetadata();
                    toolResult = {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify(
                            {
                              jobId: job.id,
                              valid: true,
                              totalBytesProcessed:
                                jobMetadata.statistics?.query
                                  ?.totalBytesProcessed || "0",
                              estimatedCost: "Query is valid",
                            },
                            null,
                            2
                          ),
                        },
                      ],
                    };
                  } else {
                    const [rows] = await job.getQueryResults({ maxResults });
                    toolResult = {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify(
                            {
                              jobId: job.id,
                              rows: rows,
                              totalRows: rows.length,
                            },
                            null,
                            2
                          ),
                        },
                      ],
                    };
                  }
                  break;

                case "get_query_results":
                  if (!this.bigquery) {
                    throw new Error("BigQuery client not initialized");
                  }
                  const { jobId, maxResults: maxResultsForJob = 100 } =
                    toolArgs;
                  const jobInstance = this.bigquery.job(jobId);
                  const [rows] = await jobInstance.getQueryResults({
                    maxResults: maxResultsForJob,
                  });
                  toolResult = {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            jobId: jobId,
                            rows: rows,
                            totalRows: rows.length,
                          },
                          null,
                          2
                        ),
                      },
                    ],
                  };
                  break;

                default:
                  throw new Error(`Unknown tool: ${toolName}`);
              }

              response = {
                jsonrpc: "2.0",
                result: toolResult,
                id: request.id,
              };
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              response = {
                jsonrpc: "2.0",
                error: { code: -32000, message: errorMessage },
                id: request.id,
              };
            }
            break;

          default:
            response = {
              jsonrpc: "2.0",
              error: { code: -32601, message: "Method not found" },
              id: request.id,
            };
        }

        res.write(`event: message\n`);
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      } catch (error) {
        if (!res.headersSent) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          res
            .status(500)
            .json({ error: "Internal server error", details: errorMessage });
        }
      }
    });

    const server = http.createServer(app);
    server.listen(port, () => {
      console.log(
        `BigQuery MCP server running on HTTP at http://localhost:${port}`
      );
      console.log(`MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`Health check: http://localhost:${port}/health`);
    });
  }

  async run(): Promise<void> {
    const transport = this.getTransportMode();
    const port = this.getPort();

    switch (transport) {
      case "stdio":
        await this.runStdio();
        break;
      case "http":
        await this.runHTTP(port);
        break;
      default:
        console.error(`Unknown transport mode: ${transport}`);
        console.error("Available modes: stdio, http");
        process.exit(1);
    }
  }
}

// Main execution
async function main() {
  try {
    const server = new BigQueryMCPServer();
    await server.run();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
