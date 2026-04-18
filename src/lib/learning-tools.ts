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

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/learning-tools`;

export async function callLearningTool(
  service: LearningService,
  input: string,
  language: "auto" | "en" | "ar" = "auto"
): Promise<LearningPayload> {
  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ service, input, language }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `Error ${resp.status}` }));
    throw new Error(err.error || `Error ${resp.status}`);
  }
  return await resp.json();
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
