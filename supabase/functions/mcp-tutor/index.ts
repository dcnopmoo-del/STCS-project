import { Hono } from "npm:hono@4.4.0";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";

const app = new Hono();

const mcpServer = new McpServer({
  name: "socratic-tutor-mcp",
  version: "1.0.0",
});

// Tool 1: Get structured hints based on topic and difficulty
mcpServer.tool({
  name: "get_structured_hint",
  description: "Provides a progressive hint for a given topic and difficulty level. Returns guidance, NOT answers.",
  inputSchema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "The subject area (e.g., 'algebra', 'physics', 'programming')" },
      subTopic: { type: "string", description: "Specific concept within the topic" },
      hintLevel: { type: "number", description: "Hint depth 1-5 (1=vague, 5=very specific but still no answer)" },
      studentAttempt: { type: "string", description: "What the student has tried so far" },
    },
    required: ["topic", "hintLevel"],
  },
  handler: async ({ topic, subTopic, hintLevel, studentAttempt }) => {
    const hints: Record<number, string> = {
      1: `Think about the fundamental concepts of ${topic}${subTopic ? ` related to ${subTopic}` : ""}. What do you already know?`,
      2: `Consider how ${subTopic || topic} connects to what you've learned before. Can you identify the key variables or components?`,
      3: `Try breaking this into smaller parts. What's the first step you'd take? ${studentAttempt ? "You mentioned: " + studentAttempt + " — what would logically follow?" : ""}`,
      4: `You're getting closer. Focus on the relationship between the elements. What pattern do you see? Think about similar problems you've solved.`,
      5: `Almost there! Review your approach step by step. Check each assumption. The key insight involves ${subTopic || "the core principle of " + topic}.`,
    };

    const hint = hints[Math.min(Math.max(hintLevel, 1), 5)] || hints[1];

    return {
      content: [{ type: "text", text: JSON.stringify({ hint, level: hintLevel, topic, subTopic }) }],
    };
  },
});

// Tool 2: Track and assess student progress
mcpServer.tool({
  name: "assess_progress",
  description: "Evaluates student progress based on their conversation and returns a guidance level.",
  inputSchema: {
    type: "object",
    properties: {
      messageCount: { type: "number", description: "Number of messages in conversation" },
      correctSteps: { type: "number", description: "Number of correct reasoning steps identified" },
      topic: { type: "string", description: "Current topic being studied" },
    },
    required: ["messageCount", "correctSteps"],
  },
  handler: async ({ messageCount, correctSteps, topic }) => {
    const ratio = messageCount > 0 ? correctSteps / messageCount : 0;
    let progressLevel: number;
    let recommendation: string;

    if (ratio > 0.7) {
      progressLevel = 5;
      recommendation = "Student shows strong understanding. Challenge with harder questions.";
    } else if (ratio > 0.5) {
      progressLevel = 4;
      recommendation = "Good progress. Provide moderate guidance.";
    } else if (ratio > 0.3) {
      progressLevel = 3;
      recommendation = "Student needs more scaffolding. Break into smaller steps.";
    } else if (ratio > 0.1) {
      progressLevel = 2;
      recommendation = "Student is struggling. Provide foundational hints.";
    } else {
      progressLevel = 1;
      recommendation = "Start with the basics. Use very simple guiding questions.";
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ progressLevel, recommendation, topic, messageCount, correctSteps }),
      }],
    };
  },
});

// Tool 3: Get relevant learning pointers (not answers)
mcpServer.tool({
  name: "get_learning_pointers",
  description: "Returns conceptual pointers and related topics to help the student explore, without giving answers.",
  inputSchema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "The topic the student is working on" },
      currentQuestion: { type: "string", description: "The student's current question" },
    },
    required: ["topic"],
  },
  handler: async ({ topic, currentQuestion }) => {
    const pointers = {
      relatedConcepts: [
        `Fundamentals of ${topic}`,
        `Common patterns in ${topic}`,
        `Real-world applications of ${topic}`,
      ],
      thinkingStrategies: [
        "Try drawing a diagram",
        "Work through a simpler version of the problem first",
        "Identify what you know vs what you need to find",
        "Check if you can use a process of elimination",
      ],
      encouragement: "Remember: struggling is part of learning. Every expert was once a beginner!",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(pointers) }],
    };
  },
});

const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
