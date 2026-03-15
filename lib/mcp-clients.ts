import "server-only";
import { createMCPClient } from "@ai-sdk/mcp";

export interface MCPServerConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

export interface MCPToolsResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>;
  closeAll: () => Promise<void>;
}

export const getDefaultMCPServers = (): MCPServerConfig[] => {
  const servers: MCPServerConfig[] = [];

  let i = 1;
  while (process.env[`MCP_SERVER_URL_${i}`]) {
    const headersJson = process.env[`MCP_SERVER_HEADERS_${i}`];
    let headers: Record<string, string> | undefined;
    if (headersJson) {
      try {
        headers = JSON.parse(headersJson);
      } catch {
        console.error(`Failed to parse MCP_SERVER_HEADERS_${i}`);
      }
    }
    servers.push({
      name: `server-${i}`,
      url: process.env[`MCP_SERVER_URL_${i}`]!,
      headers,
    });
    i++;
  }

  return servers;
};

export const createMCPTools = async (
  servers: MCPServerConfig[] = getDefaultMCPServers(),
): Promise<MCPToolsResult> => {
  if (servers.length === 0) {
    return { tools: {}, closeAll: async () => {} };
  }

  const clients = await Promise.all(
    servers.map(async (server) => {
      const client = await createMCPClient({
        transport: {
          type: "sse",
          url: server.url,
          headers: server.headers,
        },
      });
      return client;
    }),
  );

  const toolSets = await Promise.all(clients.map((client) => client.tools()));
  const mergedTools = Object.assign({}, ...toolSets);

  const closeAll = async () => {
    await Promise.allSettled(clients.map((client) => client.close()));
  };

  return { tools: mergedTools, closeAll };
};
