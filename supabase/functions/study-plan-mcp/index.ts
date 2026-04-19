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
const mcpServer = new McpServer({ name: "study-plan-mcp", version: "1.0.0" });

mcpServer.tool("generate_study_plan", {
  description: "Generate a day-by-day study plan from today until the exam date.",
  inputSchema: {
    type: "object" as const,
    properties: {
      input: { type: "string" as const, description: "Topics (comma-separated) and exam date YYYY-MM-DD" },
      language: { type: "string" as const, enum: ["auto", "en", "ar"] as const },
    },
    required: ["input"] as const,
  },
  handler: async (args: { input: string; language?: "auto" | "en" | "ar" }) => {
    const input = (args.input || "").trim();
    if (!input) throw new Error("input is required");
    const lang = args.language === "en" || args.language === "ar" ? args.language : "auto";
    const today = new Date().toISOString().slice(0, 10);
    const system = `You are an expert study planner. Distribute topics across days, mixing review, practice, flashcards, self-quizzing. Build to a final review before the exam. Today is ${today}.\n\nLANGUAGE RULE (CRITICAL): ${LANGUAGE_RULES[lang]}`;
    const payload = await callAI(system, input, "generate_study_plan", {
      type: "object",
      properties: {
        topics: { type: "array", items: { type: "string" } },
        examDate: { type: "string", description: "ISO YYYY-MM-DD" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              focus: { type: "string" },
              activities: { type: "array", items: { type: "string" } },
            },
            required: ["date", "focus", "activities"], additionalProperties: false,
          },
        },
      },
      required: ["topics", "examDate", "days"], additionalProperties: false,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
  },
});

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcpServer);
app.all("/*", async (c) => await httpHandler(c.req.raw));
Deno.serve(app.fetch);
