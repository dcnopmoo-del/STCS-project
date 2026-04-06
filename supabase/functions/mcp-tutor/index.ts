import { Hono } from "npm:hono@4.4.0";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";

const app = new Hono();

const mcpServer = new McpServer({
  name: "socratic-tutor-mcp",
  version: "1.0.0",
});

// Tool 1: Get structured hints
mcpServer.tool("get_structured_hint", {
  description: "Provides a progressive hint for a given topic. Returns guidance, NOT answers.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topic: { type: "string" as const, description: "The subject area" },
      subTopic: { type: "string" as const, description: "Specific concept" },
      hintLevel: { type: "number" as const, description: "Hint depth 1-5" },
      studentAttempt: { type: "string" as const, description: "What the student tried" },
    },
    required: ["topic", "hintLevel"] as const,
  },
  handler: (args: { topic: string; subTopic?: string; hintLevel: number; studentAttempt?: string }) => {
    const { topic, subTopic, hintLevel, studentAttempt } = args;
    const hints: Record<number, string> = {
      1: `Think about the fundamental concepts of ${topic}${subTopic ? ` related to ${subTopic}` : ""}. What do you already know?`,
      2: `Consider how ${subTopic || topic} connects to what you've learned before. Can you identify the key variables?`,
      3: `Try breaking this into smaller parts. ${studentAttempt ? "You mentioned: " + studentAttempt + " — what follows?" : "What's the first step?"}`,
      4: `Focus on the relationship between the elements. What pattern do you see?`,
      5: `Almost there! The key insight involves ${subTopic || "the core principle of " + topic}.`,
    };
    const hint = hints[Math.min(Math.max(hintLevel, 1), 5)] || hints[1];
    return { content: [{ type: "text" as const, text: JSON.stringify({ hint, level: hintLevel, topic }) }] };
  },
});

// Tool 2: Assess student progress
mcpServer.tool("assess_progress", {
  description: "Evaluates student progress and returns a guidance level.",
  inputSchema: {
    type: "object" as const,
    properties: {
      messageCount: { type: "number" as const, description: "Number of messages" },
      correctSteps: { type: "number" as const, description: "Correct reasoning steps" },
      topic: { type: "string" as const, description: "Current topic" },
    },
    required: ["messageCount", "correctSteps"] as const,
  },
  handler: (args: { messageCount: number; correctSteps: number; topic?: string }) => {
    const { messageCount, correctSteps, topic } = args;
    const ratio = messageCount > 0 ? correctSteps / messageCount : 0;
    let progressLevel: number;
    let recommendation: string;
    if (ratio > 0.7) { progressLevel = 5; recommendation = "Strong understanding. Challenge them."; }
    else if (ratio > 0.5) { progressLevel = 4; recommendation = "Good progress. Moderate guidance."; }
    else if (ratio > 0.3) { progressLevel = 3; recommendation = "Needs scaffolding. Smaller steps."; }
    else if (ratio > 0.1) { progressLevel = 2; recommendation = "Struggling. Foundational hints."; }
    else { progressLevel = 1; recommendation = "Start with basics."; }
    return { content: [{ type: "text" as const, text: JSON.stringify({ progressLevel, recommendation, topic }) }] };
  },
});

// Tool 3: Get learning pointers
mcpServer.tool("get_learning_pointers", {
  description: "Returns conceptual pointers without giving answers.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topic: { type: "string" as const, description: "The topic" },
    },
    required: ["topic"] as const,
  },
  handler: (args: { topic: string }) => {
    const pointers = {
      relatedConcepts: [`Fundamentals of ${args.topic}`, `Common patterns in ${args.topic}`, `Real-world applications`],
      thinkingStrategies: ["Draw a diagram", "Simplify the problem first", "Identify knowns vs unknowns"],
      encouragement: "Struggling is part of learning!",
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(pointers) }] };
  },
});

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcpServer);

app.all("/*", async (c) => {
  const response = await httpHandler(c.req.raw);
  return response;
});

Deno.serve(app.fetch);
