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
    const level = Math.min(Math.max(hintLevel, 1), 5);
    const hints: Record<number, string> = {
      1: `Think about the fundamental concepts of ${topic}${subTopic ? ` related to ${subTopic}` : ""}. What do you already know?`,
      2: `Consider how ${subTopic || topic} connects to what you've learned before. Can you identify the key variables?`,
      3: `Try breaking this into smaller parts. ${studentAttempt ? "You mentioned: " + studentAttempt + " — what follows?" : "What's the first step?"}`,
      4: `Focus on the relationship between the elements. What pattern do you see?`,
      5: `Almost there! The key insight involves ${subTopic || "the core principle of " + topic}.`,
    };
    return { content: [{ type: "text" as const, text: JSON.stringify({ hint: hints[level], level, topic }) }] };
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

// Tool 4: Analyze student answer
mcpServer.tool("analyze_student_answer", {
  description: "Analyzes the student's answer and determines if it is correct, partially correct, or incorrect with an explanation.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topic: { type: "string" as const, description: "The subject area or question context" },
      expectedConcept: { type: "string" as const, description: "The key concept or principle the correct answer should demonstrate" },
      studentAnswer: { type: "string" as const, description: "The student's submitted answer" },
      questionContext: { type: "string" as const, description: "The original question or problem statement" },
    },
    required: ["topic", "expectedConcept", "studentAnswer"] as const,
  },
  handler: (args: { topic: string; expectedConcept: string; studentAnswer: string; questionContext?: string }) => {
    const { topic, expectedConcept, studentAnswer, questionContext } = args;

    if (!studentAnswer.trim()) {
      return { content: [{ type: "text" as const, text: JSON.stringify({
        status: "incomplete",
        explanation: "No answer was provided. Try expressing your thoughts, even if you're unsure.",
        guidance: "Start by identifying what you know about the problem.",
      }) }] };
    }

    const answerLower = studentAnswer.toLowerCase();
    const conceptLower = expectedConcept.toLowerCase();
    const conceptKeywords = conceptLower.split(/\s+/).filter(w => w.length > 3);
    const matchedKeywords = conceptKeywords.filter(kw => answerLower.includes(kw));
    const matchRatio = conceptKeywords.length > 0 ? matchedKeywords.length / conceptKeywords.length : 0;

    let status: string;
    let explanation: string;
    let guidance: string;

    if (matchRatio >= 0.7) {
      status = "correct";
      explanation = `Your answer demonstrates a solid understanding of ${topic}. You correctly identified key aspects: ${matchedKeywords.join(", ")}.`;
      guidance = "Excellent work! Can you think of how this concept applies in a different scenario?";
    } else if (matchRatio >= 0.3) {
      status = "partially_correct";
      const missing = conceptKeywords.filter(kw => !answerLower.includes(kw));
      explanation = `You're on the right track with ${topic}! You've grasped some key ideas (${matchedKeywords.join(", ")}), but there are aspects still to explore.`;
      guidance = `Think more about: ${missing.slice(0, 3).join(", ")}. How do they relate to ${questionContext || "the problem"}?`;
    } else {
      status = "incorrect";
      explanation = `Your answer doesn't yet align with the core concept of ${expectedConcept} in ${topic}. That's okay — this is how we learn!`;
      guidance = `Let's step back. What do you understand about ${topic}? Try to identify the fundamental principle at work here.`;
    }

    return { content: [{ type: "text" as const, text: JSON.stringify({
      status,
      explanation,
      guidance,
      topic,
      matchConfidence: Math.round(matchRatio * 100),
    }) }] };
  },
});

// Tool 5: Detect misconception
mcpServer.tool("detect_misconception", {
  description: "Detects common conceptual mistakes in the student's answer such as wrong formulas, misunderstanding of concepts, or incorrect operations.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topic: { type: "string" as const, description: "The subject area" },
      studentAnswer: { type: "string" as const, description: "The student's response to analyze" },
      commonMistakes: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "List of common mistakes for this topic",
      },
    },
    required: ["topic", "studentAnswer"] as const,
  },
  handler: (args: { topic: string; studentAnswer: string; commonMistakes?: string[] }) => {
    const { topic, studentAnswer, commonMistakes } = args;

    if (!studentAnswer.trim()) {
      return { content: [{ type: "text" as const, text: JSON.stringify({
        detected: false,
        message: "No answer provided to analyze for misconceptions.",
      }) }] };
    }

    const answerLower = studentAnswer.toLowerCase();

    // Built-in misconception patterns
    const misconceptionPatterns: { pattern: RegExp; misconception: string; correction: string }[] = [
      { pattern: /multiply.*add|add.*multiply/i, misconception: "Confusing order of operations", correction: "Remember PEMDAS/BODMAS — multiplication comes before addition unless grouped by parentheses." },
      { pattern: /same\s*as|equal.*to.*opposite/i, misconception: "Confusing related but distinct concepts", correction: `In ${topic}, these concepts may seem similar but have important differences. Try to identify what makes each unique.` },
      { pattern: /always|never|impossible/i, misconception: "Overgeneralization", correction: `Be careful with absolute statements in ${topic}. Most rules have conditions or exceptions. When does this apply, and when doesn't it?` },
      { pattern: /just|simply|obviously/i, misconception: "Oversimplification", correction: `This problem in ${topic} may have more nuance than it appears. What assumptions are you making?` },
      { pattern: /guess|random|maybe.*maybe/i, misconception: "Guessing without reasoning", correction: "Try to reason through the problem step by step rather than guessing. What information do you have to work with?" },
    ];

    const detectedMisconceptions: { misconception: string; correction: string }[] = [];

    for (const mp of misconceptionPatterns) {
      if (mp.pattern.test(answerLower)) {
        detectedMisconceptions.push({ misconception: mp.misconception, correction: mp.correction });
      }
    }

    // Check against provided common mistakes
    if (commonMistakes?.length) {
      for (const mistake of commonMistakes) {
        const mistakeWords = mistake.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const found = mistakeWords.some(w => answerLower.includes(w));
        if (found) {
          detectedMisconceptions.push({
            misconception: mistake,
            correction: `This is a common mistake in ${topic}. Let's revisit the underlying concept — what rule or principle applies here?`,
          });
        }
      }
    }

    return { content: [{ type: "text" as const, text: JSON.stringify({
      detected: detectedMisconceptions.length > 0,
      misconceptions: detectedMisconceptions,
      topic,
      suggestion: detectedMisconceptions.length > 0
        ? "Let's address these misconceptions one at a time. Which one would you like to explore first?"
        : "No obvious misconceptions detected. Let's continue working through the problem.",
    }) }] };
  },
});

// Tool 6: Generate follow-up question
mcpServer.tool("generate_followup_question", {
  description: "Generates a Socratic-style follow-up question that guides the student toward the correct solution without giving the answer.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topic: { type: "string" as const, description: "The subject area" },
      studentAnswer: { type: "string" as const, description: "The student's most recent answer" },
      correctDirection: { type: "string" as const, description: "The concept direction the student should move toward" },
      difficultyLevel: { type: "number" as const, description: "Difficulty 1-5, affects how leading the question is" },
    },
    required: ["topic", "studentAnswer", "correctDirection"] as const,
  },
  handler: (args: { topic: string; studentAnswer: string; correctDirection: string; difficultyLevel?: number }) => {
    const { topic, studentAnswer, correctDirection, difficultyLevel = 3 } = args;
    const level = Math.min(Math.max(difficultyLevel, 1), 5);

    const questionTemplates: Record<number, string[]> = {
      1: [
        `You mentioned "${studentAnswer.slice(0, 50)}..." — what is the most basic rule of ${topic} that applies here?`,
        `Let's start simple: what does ${correctDirection} mean in your own words?`,
        `Can you give me an example of ${correctDirection} from everyday life?`,
      ],
      2: [
        `Good thinking! Now, how does ${correctDirection} connect to what you said about "${studentAnswer.slice(0, 40)}"?`,
        `You're getting closer. What would change if you applied ${correctDirection} to your approach?`,
        `What do you think happens when we consider ${correctDirection} in this context?`,
      ],
      3: [
        `Interesting approach. But consider: how does ${correctDirection} affect the outcome here?`,
        `What if you looked at this from the perspective of ${correctDirection}? Would your answer change?`,
        `You've identified part of the picture. What role does ${correctDirection} play in completing it?`,
      ],
      4: [
        `Strong reasoning so far. Can you prove why ${correctDirection} must be the key factor here?`,
        `How would you explain the relationship between your answer and ${correctDirection} to someone else?`,
        `What evidence in the problem supports using ${correctDirection}?`,
      ],
      5: [
        `You clearly understand the basics. Now, what edge cases or exceptions should we consider with ${correctDirection}?`,
        `How would this problem change if we modified the constraints around ${correctDirection}?`,
        `Can you generalize your approach using ${correctDirection} to solve a broader class of problems?`,
      ],
    };

    const templates = questionTemplates[level];
    const question = templates[Math.floor(Math.random() * templates.length)];

    return { content: [{ type: "text" as const, text: JSON.stringify({
      followUpQuestion: question,
      purpose: "Guide student toward understanding without revealing the answer",
      difficultyLevel: level,
      topic,
    }) }] };
  },
});

// Tool 7: Adjust difficulty
mcpServer.tool("adjust_difficulty", {
  description: "Adjusts the hint difficulty level dynamically based on student performance. Simplifies if struggling, increases complexity if doing well.",
  inputSchema: {
    type: "object" as const,
    properties: {
      currentLevel: { type: "number" as const, description: "Current difficulty level 1-5" },
      recentCorrect: { type: "number" as const, description: "Number of correct responses in recent attempts" },
      recentTotal: { type: "number" as const, description: "Total number of recent attempts" },
      consecutiveFailures: { type: "number" as const, description: "Number of consecutive incorrect attempts" },
      topic: { type: "string" as const, description: "Current topic for context" },
    },
    required: ["currentLevel", "recentCorrect", "recentTotal"] as const,
  },
  handler: (args: { currentLevel: number; recentCorrect: number; recentTotal: number; consecutiveFailures?: number; topic?: string }) => {
    const { currentLevel, recentCorrect, recentTotal, consecutiveFailures = 0, topic } = args;
    const level = Math.min(Math.max(currentLevel, 1), 5);
    const successRate = recentTotal > 0 ? recentCorrect / recentTotal : 0;

    let newLevel = level;
    let adjustment: string;
    let reason: string;

    if (consecutiveFailures >= 3) {
      newLevel = Math.max(level - 2, 1);
      adjustment = "significant_decrease";
      reason = `Student has failed ${consecutiveFailures} times consecutively. Dropping difficulty significantly to rebuild confidence.`;
    } else if (successRate < 0.25 && recentTotal >= 3) {
      newLevel = Math.max(level - 1, 1);
      adjustment = "decrease";
      reason = `Low success rate (${Math.round(successRate * 100)}%). Simplifying hints to provide more support.`;
    } else if (successRate > 0.8 && recentTotal >= 3) {
      newLevel = Math.min(level + 1, 5);
      adjustment = "increase";
      reason = `High success rate (${Math.round(successRate * 100)}%). Increasing complexity to challenge the student.`;
    } else if (successRate > 0.6 && recentTotal >= 5) {
      newLevel = Math.min(level + 1, 5);
      adjustment = "slight_increase";
      reason = `Consistent performance (${Math.round(successRate * 100)}%). Gently increasing difficulty.`;
    } else {
      adjustment = "maintain";
      reason = `Current performance (${Math.round(successRate * 100)}%) suggests the current level is appropriate.`;
    }

    return { content: [{ type: "text" as const, text: JSON.stringify({
      previousLevel: level,
      newLevel,
      adjustment,
      reason,
      successRate: Math.round(successRate * 100),
      topic,
    }) }] };
  },
});

// Tool 8: Track attempts
mcpServer.tool("track_attempts", {
  description: "Tracks how many attempts the student has made on a problem. Used to decide when to escalate hints or reveal the final answer.",
  inputSchema: {
    type: "object" as const,
    properties: {
      currentAttempts: { type: "number" as const, description: "Current number of attempts so far" },
      maxAttempts: { type: "number" as const, description: "Maximum attempts before answer reveal (default 5)" },
      lastAnswerCorrect: { type: "boolean" as const, description: "Whether the last attempt was correct" },
      topic: { type: "string" as const, description: "Current topic" },
      frustrationSignals: { type: "number" as const, description: "Number of frustration indicators detected (0-5)" },
    },
    required: ["currentAttempts"] as const,
  },
  handler: (args: { currentAttempts: number; maxAttempts?: number; lastAnswerCorrect?: boolean; topic?: string; frustrationSignals?: number }) => {
    const { currentAttempts, maxAttempts = 5, lastAnswerCorrect = false, topic, frustrationSignals = 0 } = args;
    const attempts = Math.max(currentAttempts, 0);
    const cap = Math.max(maxAttempts, 1);

    // Frustration can lower the threshold
    const effectiveMax = Math.max(cap - Math.floor(frustrationSignals / 2), 2);
    const attemptsRemaining = Math.max(effectiveMax - attempts, 0);
    const shouldRevealAnswer = attempts >= effectiveMax;
    const progressPercent = Math.min(Math.round((attempts / effectiveMax) * 100), 100);

    let escalationLevel: string;
    let guidance: string;

    if (lastAnswerCorrect) {
      escalationLevel = "resolved";
      guidance = "Great job! The student found the answer. Reinforce the learning with a summary.";
    } else if (shouldRevealAnswer) {
      escalationLevel = "reveal_answer";
      guidance = `After ${attempts} attempts${frustrationSignals > 0 ? " and signs of frustration" : ""}, it's time to provide the answer with a thorough, educational explanation.`;
    } else if (attempts >= effectiveMax - 1) {
      escalationLevel = "final_hint";
      guidance = "This is the last chance before revealing the answer. Give the most explicit hint possible without stating the answer directly.";
    } else if (attempts >= Math.ceil(effectiveMax * 0.6)) {
      escalationLevel = "strong_hint";
      guidance = `The student has used ${attempts}/${effectiveMax} attempts. Provide increasingly direct hints.`;
    } else if (attempts >= Math.ceil(effectiveMax * 0.3)) {
      escalationLevel = "moderate_hint";
      guidance = "Provide moderate guidance. The student is working through the problem.";
    } else {
      escalationLevel = "gentle_guidance";
      guidance = "Early attempts. Use Socratic questioning and gentle nudges.";
    }

    return { content: [{ type: "text" as const, text: JSON.stringify({
      attempts,
      attemptsRemaining,
      effectiveMaxAttempts: effectiveMax,
      shouldRevealAnswer,
      escalationLevel,
      guidance,
      progressPercent,
      topic,
    }) }] };
  },
});

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcpServer);

app.all("/*", async (c) => {
  const response = await httpHandler(c.req.raw);
  return response;
});

Deno.serve(app.fetch);
