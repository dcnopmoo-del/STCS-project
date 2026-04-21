import { Hono } from "npm:hono@4.4.0";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";

const LANGUAGE_RULES = {
  auto: `Detect the language of the user's input. If Arabic, output ALL text fields in Arabic. If English, in English. Never mix.`,
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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      tools: [{ type: "function", function: { name: toolName, parameters } }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No structured output from model");
  return JSON.parse(args);
}

const app = new Hono();
const mcpServer = new McpServer({ name: "flashcards-mcp", version: "1.0.0" });

mcpServer.tool("generate_flashcards", {
  description: "Generate 5-10 study flashcards for a given topic.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topic: { type: "string" as const, description: "Topic to create flashcards for" },
      language: { type: "string" as const, enum: ["auto", "en", "ar"] as const, description: "Output language" },
    },
    required: ["topic"] as const,
  },
  handler: async (args: { topic: string; language?: "auto" | "en" | "ar" }) => {
    const topic = (args.topic || "").trim();
    if (!topic) throw new Error("topic is required");
    const lang = args.language === "en" || args.language === "ar" ? args.language : "auto";
    const system = `You are an expert tutor creating concise, accurate study flashcards for spaced-repetition revision.

REQUIREMENTS:
- Generate 6-8 cards covering the most important, distinct ideas of the topic (no near-duplicates).
- "front": a short, specific prompt — a term to define, a question to answer, or a "what / why / how" question. Max ~15 words.
- "back": a clear, factually correct answer in 1-3 sentences. No filler, no "the answer is...".
- Cover a range: definitions, mechanisms, examples, and one application or contrast.
- Plain text only. No markdown, no bullet points, no numbering.\n\nLANGUAGE RULE (CRITICAL): ${LANGUAGE_RULES[lang]}`;
    const payload = await callAI(system, `Create flashcards for: ${topic}`, "generate_flashcards", {
      type: "object",
      properties: {
        topic: { type: "string" },
        cards: {
          type: "array", minItems: 5, maxItems: 10,
          items: {
            type: "object",
            properties: { front: { type: "string" }, back: { type: "string" } },
            required: ["front", "back"], additionalProperties: false,
          },
        },
      },
      required: ["topic", "cards"], additionalProperties: false,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
  },
});

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcpServer);
app.all("/*", async (c) => await httpHandler(c.req.raw));
Deno.serve(app.fetch);
