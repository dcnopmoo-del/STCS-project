import { Hono } from "npm:hono@4.4.0";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";

const LANGUAGE_RULES = {
  auto: `Detect input language. Arabic input → Arabic output. English input → English output. Never mix.`,
  en: `Output ALL text fields in English regardless of input language.`,
  ar: `أنتج جميع الحقول النصية باللغة العربية بغض النظر عن لغة الإدخال.`,
} as const;

async function callAI(systemPrompt: string, userInput: string, toolName: string, parameters: Record<string, unknown>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userInput }],
      tools: [{ type: "function", function: { name: toolName, parameters } }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });
  if (!resp.ok) throw new Error(`AI gateway ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const a = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!a) throw new Error("No structured output from model");
  return JSON.parse(a);
}

const app = new Hono();
const mcpServer = new McpServer({ name: "analogy-mcp", version: "1.0.0" });

mcpServer.tool("generate_analogy", {
  description: "Generate a vivid real-world analogy explaining a concept.",
  inputSchema: {
    type: "object" as const,
    properties: {
      concept: { type: "string" as const, description: "Concept to explain" },
      language: { type: "string" as const, enum: ["auto", "en", "ar"] as const },
    },
    required: ["concept"] as const,
  },
  handler: async (args: { concept: string; language?: "auto" | "en" | "ar" }) => {
    const concept = (args.concept || "").trim();
    if (!concept) throw new Error("concept is required");
    const lang = args.language === "en" || args.language === "ar" ? args.language : "auto";
    const system = `You are an expert teacher who explains complex ideas through vivid, relatable real-world analogies. Be concrete and memorable.\n\nLANGUAGE RULE (CRITICAL): ${LANGUAGE_RULES[lang]}`;
    const payload = await callAI(system, `Explain with an analogy: ${concept}`, "generate_analogy", {
      type: "object",
      properties: {
        concept: { type: "string" },
        analogy: { type: "string" },
        explanation: { type: "string" },
        mapping: {
          type: "array",
          items: {
            type: "object",
            properties: { from: { type: "string" }, to: { type: "string" } },
            required: ["from", "to"], additionalProperties: false,
          },
        },
      },
      required: ["concept", "analogy", "explanation", "mapping"], additionalProperties: false,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
  },
});

const transport = new StreamableHttpTransport();
app.all("/*", async (c) => await transport.handleRequest(c.req.raw, mcpServer));
Deno.serve(app.fetch);
