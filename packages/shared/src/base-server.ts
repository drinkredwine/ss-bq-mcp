#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import http from "http";

export interface ServerConfig {
  name: string;
  version: string;
  description: string;
}

export interface TransportConfig {
  mode: "stdio" | "http";
  port?: number;
}

export abstract class BaseMCPServer {
  protected server: McpServer;
  protected config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    // Initialize the MCP server with proper capabilities
    this.server = new McpServer(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initialize();
    this.setupTools();
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract initialize(): void;
  protected abstract setupTools(): void;

  // Common transport mode detection
  protected getTransportMode(): "stdio" | "http" {
    const args = process.argv.slice(2);
    const transportArg = args.find((arg) => arg.startsWith("--transport"));

    if (transportArg) {
      if (transportArg.includes("=")) {
        const mode = transportArg.split("=")[1];
        return mode === "http" ? "http" : "stdio";
      } else {
        const index = args.indexOf(transportArg);
        const mode = args[index + 1];
        return mode === "http" ? "http" : "stdio";
      }
    }

    // Check if we're being called with HTTP-specific arguments
    if (args.some((arg) => arg.startsWith("--port") || arg === "http")) {
      return "http";
    }

    return "stdio";
  }

  // Common port detection
  protected getPort(): number {
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

  // Stdio transport implementation
  async runStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  // HTTP transport implementation
  async runHTTP(port: number): Promise<void> {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        server: this.config.name,
        version: this.config.version,
        timestamp: new Date().toISOString(),
      });
    });

    // MCP endpoint
    app.post("/mcp", async (req, res) => {
      try {
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
                  name: this.config.name,
                  version: this.config.version,
                },
              },
              id: request.id,
            };
            break;

          case "tools/list":
            response = await this.handleToolsList(request);
            break;

          case "tools/call":
            response = await this.handleToolCall(request);
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
        `${this.config.name} running on HTTP at http://localhost:${port}`
      );
      console.log(`MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`Health check: http://localhost:${port}/health`);
    });
  }

  // Abstract methods for HTTP tool handling (to be implemented by subclasses)
  protected abstract handleToolsList(request: any): Promise<any>;
  protected abstract handleToolCall(request: any): Promise<any>;

  // Main run method
  async run(): Promise<void> {
    const transport = this.getTransportMode();
    const port = this.getPort();

    switch (transport) {
      case "stdio":
        console.log(`Starting ${this.config.name} in stdio mode...`);
        await this.runStdio();
        break;
      case "http":
        console.log(
          `Starting ${this.config.name} in HTTP mode on port ${port}...`
        );
        await this.runHTTP(port);
        break;
      default:
        console.error(`Unknown transport mode: ${transport}`);
        console.error("Available modes: stdio, http");
        process.exit(1);
    }
  }
}
