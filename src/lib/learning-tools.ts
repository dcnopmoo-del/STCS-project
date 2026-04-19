export type Flashcard = { front: string; back: string };
export type FlashcardsPayload = { topic: string; cards: Flashcard[] };

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};
export type QuizPayload = { topic: string; questions: QuizQuestion[] };

export type AnalogyPayload = {
  concept: string;
  analogy: string;
  explanation: string;
  mapping: { from: string; to: string }[];
};

export type StudyPlanDay = { date: string; focus: string; activities: string[] };
export type StudyPlanPayload = { topics: string[]; examDate: string; days: StudyPlanDay[] };

export type ConceptNode = { label: string; children?: ConceptNode[] };
export type ConceptMapPayload = { topic: string; root: ConceptNode };

export type LearningService = "flashcards" | "quiz" | "analogy" | "study_plan" | "concept_map";

export type LearningPayload =
  | { service: "flashcards"; payload: FlashcardsPayload }
  | { service: "quiz"; payload: QuizPayload }
  | { service: "analogy"; payload: AnalogyPayload }
  | { service: "study_plan"; payload: StudyPlanPayload }
  | { service: "concept_map"; payload: ConceptMapPayload };

// Each learning service is now its own MCP server edge function.
const MCP_ENDPOINTS: Record<LearningService, { url: string; tool: string; argKey: string }> = {
  flashcards:  { url: "flashcards-mcp",  tool: "generate_flashcards",   argKey: "topic" },
  quiz:        { url: "quiz-mcp",        tool: "generate_quiz",         argKey: "topic" },
  analogy:     { url: "analogy-mcp",     tool: "generate_analogy",      argKey: "concept" },
  study_plan:  { url: "study-plan-mcp",  tool: "generate_study_plan",   argKey: "input" },
  concept_map: { url: "concept-map-mcp", tool: "generate_concept_map",  argKey: "topic" },
};

export async function callLearningTool(
  service: LearningService,
  input: string,
  language: "auto" | "en" | "ar" = "auto"
): Promise<LearningPayload> {
  const cfg = MCP_ENDPOINTS[service];
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${cfg.url}`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: cfg.tool, arguments: { [cfg.argKey]: input, language } },
    }),
  });

  if (!resp.ok) {
    throw new Error(`MCP ${service} error ${resp.status}`);
  }

  const text = await resp.text();
  // MCP Streamable HTTP returns SSE-style "data: {json}" lines (or plain JSON)
  const candidates: string[] = [];
  if (text.trim().startsWith("{")) {
    candidates.push(text.trim());
  } else {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data: ")) {
        const payload = trimmed.slice(6).trim();
        if (payload && payload !== "[DONE]") candidates.push(payload);
      }
    }
  }

  for (const jsonStr of candidates) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.error) throw new Error(data.error.message || `MCP error`);
      const inner = data.result?.content?.[0]?.text;
      if (inner) {
        const payload = JSON.parse(inner);
        return { service, payload } as LearningPayload;
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("MCP error")) throw e;
      // skip malformed line
    }
  }
  throw new Error("No valid response from MCP server");
}

// Marker prefix used to embed structured payloads inside assistant message content.
// This lets us reuse the existing message rendering pipeline + persistence.
export const LEARNING_MARKER = "::LEARNING::";

export function encodeLearningMessage(data: LearningPayload): string {
  return `${LEARNING_MARKER}${JSON.stringify(data)}`;
}

export function decodeLearningMessage(content: string): LearningPayload | null {
  if (!content.startsWith(LEARNING_MARKER)) return null;
  try {
    return JSON.parse(content.slice(LEARNING_MARKER.length)) as LearningPayload;
  } catch {
    return null;
  }
}

export const SERVICE_LABELS: Record<LearningService, { en: string; ar: string; promptEn: string; promptAr: string }> = {
  flashcards: {
    en: "Flashcards",
    ar: "بطاقات تعليمية",
    promptEn: "What topic should I make flashcards for?",
    promptAr: "ما الموضوع الذي تريد إنشاء بطاقات تعليمية له؟",
  },
  quiz: {
    en: "Quiz",
    ar: "اختبار",
    promptEn: "What topic should the quiz cover?",
    promptAr: "ما الموضوع الذي يجب أن يغطيه الاختبار؟",
  },
  analogy: {
    en: "Analogy",
    ar: "تشبيه",
    promptEn: "Which concept should I explain with an analogy?",
    promptAr: "ما المفهوم الذي تريد شرحه بتشبيه؟",
  },
  study_plan: {
    en: "Study Plan",
    ar: "خطة دراسية",
    promptEn: "List your topics (comma-separated) and exam date (YYYY-MM-DD).",
    promptAr: "اذكر مواضيعك (مفصولة بفواصل) وتاريخ الامتحان (YYYY-MM-DD).",
  },
  concept_map: {
    en: "Concept Map",
    ar: "خريطة المفاهيم",
    promptEn: "What topic should the concept map cover?",
    promptAr: "ما الموضوع الذي يجب أن تغطيه خريطة المفاهيم؟",
  },
};
