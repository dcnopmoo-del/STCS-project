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
const mcpServer = new McpServer({ name: "quiz-mcp", version: "1.0.0" });

mcpServer.tool("generate_quiz", {
  description: "Generate a 5-question multiple-choice quiz on a topic.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topic: { type: "string" as const, description: "Quiz topic" },
      language: { type: "string" as const, enum: ["auto", "en", "ar"] as const },
    },
    required: ["topic"] as const,
  },
  handler: async (args: { topic: string; language?: "auto" | "en" | "ar" }) => {
    const topic = (args.topic || "").trim();
    if (!topic) throw new Error("topic is required");
    const lang = args.language === "en" || args.language === "ar" ? args.language : "auto";
    const system = `You are an expert quiz writer. Write 5 multiple-choice questions of varying difficulty. Distractors plausible but unambiguously wrong. Brief explanation per correct answer.\n\nLANGUAGE RULE (CRITICAL): ${LANGUAGE_RULES[lang]}`;
    const payload = await callAI(system, `Create a quiz on: ${topic}`, "generate_quiz", {
      type: "object",
      properties: {
        topic: { type: "string" },
        questions: {
          type: "array", minItems: 5, maxItems: 5,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
              correctIndex: { type: "number" },
              explanation: { type: "string" },
            },
            required: ["question", "options", "correctIndex", "explanation"], additionalProperties: false,
          },
        },
      },
      required: ["topic", "questions"], additionalProperties: false,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
  },
});

const transport = new StreamableHttpTransport();
app.all("/*", async (c) => await transport.handleRequest(c.req.raw, mcpServer));
Deno.serve(app.fetch);
