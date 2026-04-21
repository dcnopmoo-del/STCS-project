// Wolfram Alpha MCP server. Uses the Short Answers API as a backend tool for
// the Socratic tutor. The tutor must use these results to build hints, not to
// reveal final answers (except in the "last resort" case enforced by the
// tutor's own escalation prompt).
//
// Required secret: WOLFRAM_APP_ID (free tier, 2000 calls/month).
// If the secret is missing, the tool returns a clear, structured error so the
// tutor can gracefully fall back to its own reasoning.

import { Hono } from "npm:hono@4.4.0";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";

const app = new Hono();
const mcpServer = new McpServer({ name: "wolfram-mcp", version: "1.0.0" });

mcpServer.tool("wolfram_query", {
  description:
    "Query Wolfram Alpha for a computational/factual result. Use this as a BACKEND tool to ground hints, NOT to display the final answer to students directly.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "Natural-language math/science query, e.g. 'derivative of x^2 sin(x)'" },
    },
    required: ["query"] as const,
  },
  handler: async (args: { query: string }) => {
    const query = (args.query || "").trim();
    if (!query) throw new Error("query is required");

    const appId = Deno.env.get("WOLFRAM_APP_ID");
    if (!appId) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            ok: false,
            error: "WOLFRAM_APP_ID is not configured. Tutor should fall back to its own reasoning.",
          }),
        }],
      };
    }

    const url = `https://api.wolframalpha.com/v1/result?appid=${encodeURIComponent(appId)}&i=${encodeURIComponent(query)}`;
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      if (!resp.ok) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ ok: false, status: resp.status, error: text.slice(0, 200) }),
          }],
        };
      }
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ ok: true, query, result: text }),
        }],
      };
    } catch (e) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "fetch failed" }),
        }],
      };
    }
  },
});

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcpServer);
app.all("/*", async (c) => await httpHandler(c.req.raw));
Deno.serve(app.fetch);
