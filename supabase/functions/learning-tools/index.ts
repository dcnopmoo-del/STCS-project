import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANGUAGE_RULES = {
  auto: `Detect the language of the user's topic/input. If the topic is in Arabic, produce ALL text fields in Arabic. If in English, produce ALL text fields in English. Never mix languages within a single response.`,
  en: `The user has selected English. Produce ALL text fields in English regardless of the input language.`,
  ar: `لقد اختار المستخدم اللغة العربية. أنتج جميع الحقول النصية باللغة العربية بغض النظر عن لغة الإدخال.`,
} as const;

type Service = "flashcards" | "quiz" | "analogy" | "study_plan" | "concept_map";

const TOOLS: Record<Service, { description: string; parameters: Record<string, unknown> }> = {
  flashcards: {
    description: "Return 5-10 flashcards (front=question/term, back=answer/definition) for the topic.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string" },
        cards: {
          type: "array",
          minItems: 5,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              front: { type: "string", description: "Question or term to learn" },
              back: { type: "string", description: "Answer or definition" },
            },
            required: ["front", "back"],
            additionalProperties: false,
          },
        },
      },
      required: ["topic", "cards"],
      additionalProperties: false,
    },
  },
  quiz: {
    description: "Return exactly 5 multiple-choice questions, 4 options each, exactly one correct.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string" },
        questions: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: { type: "string" },
              },
              correctIndex: { type: "number", description: "0-3 index of the correct option" },
              explanation: { type: "string", description: "Brief explanation of the correct answer" },
            },
            required: ["question", "options", "correctIndex", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["topic", "questions"],
      additionalProperties: false,
    },
  },
  analogy: {
    description: "Return a clear real-world analogy for the given concept with a short explanation.",
    parameters: {
      type: "object",
      properties: {
        concept: { type: "string" },
        analogy: { type: "string", description: "The analogy itself, 1-3 sentences" },
        explanation: { type: "string", description: "Why the analogy works, 2-4 sentences" },
        mapping: {
          type: "array",
          description: "How parts of the analogy map to parts of the concept",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
            },
            required: ["from", "to"],
            additionalProperties: false,
          },
        },
      },
      required: ["concept", "analogy", "explanation", "mapping"],
      additionalProperties: false,
    },
  },
  study_plan: {
    description: "Return a day-by-day study plan from today until the exam date.",
    parameters: {
      type: "object",
      properties: {
        topics: { type: "array", items: { type: "string" } },
        examDate: { type: "string", description: "ISO date YYYY-MM-DD" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "ISO date YYYY-MM-DD" },
              focus: { type: "string", description: "Main topic(s) for the day" },
              activities: {
                type: "array",
                items: { type: "string" },
                description: "2-4 concrete activities (review, practice, flashcards, quiz, etc.)",
              },
            },
            required: ["date", "focus", "activities"],
            additionalProperties: false,
          },
        },
      },
      required: ["topics", "examDate", "days"],
      additionalProperties: false,
    },
  },
  concept_map: {
    description: "Return a hierarchical concept map (mind map) for the topic. Use 2-3 levels of depth.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string" },
        root: {
          type: "object",
          properties: {
            label: { type: "string" },
            children: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  children: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                      },
                      required: ["label"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["label"],
                additionalProperties: false,
              },
            },
          },
          required: ["label", "children"],
          additionalProperties: false,
        },
      },
      required: ["topic", "root"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPTS: Record<Service, string> = {
  flashcards: "You are an expert tutor creating concise, accurate study flashcards. Each front should be short (term or focused question). Each back should be a clear, complete answer in 1-3 sentences.",
  quiz: "You are an expert quiz writer. Write 5 multiple-choice questions of varying difficulty. Make distractors plausible but unambiguously wrong. Provide a brief explanation for each correct answer.",
  analogy: "You are an expert teacher who explains complex ideas through vivid, relatable real-world analogies. Be concrete and memorable.",
  study_plan: "You are an expert study planner. Distribute topics across the available days, mixing review, active practice, flashcards, and self-quizzing. Build up to a final review day before the exam.",
  concept_map: "You are an expert at building hierarchical concept maps. Identify the main topic, 4-7 key subtopics, and 2-4 sub-subtopics under each. Keep labels concise (1-5 words).",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { service, input, language } = await req.json() as {
      service: Service;
      input: string;
      language?: "auto" | "en" | "ar";
    };

    if (!service || !TOOLS[service]) {
      return new Response(JSON.stringify({ error: "Invalid service" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!input || typeof input !== "string" || !input.trim()) {
      return new Response(JSON.stringify({ error: "Input is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langKey = (language === "en" || language === "ar") ? language : "auto";
    const today = new Date().toISOString().slice(0, 10);
    const systemContent = `${SYSTEM_PROMPTS[service]}\n\nLANGUAGE RULE (CRITICAL): ${LANGUAGE_RULES[langKey]}\n\nToday's date is ${today}. Use this when planning schedules.`;

    const tool = TOOLS[service];
    const toolName = `generate_${service}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: input },
        ],
        tools: [{
          type: "function",
          function: {
            name: toolName,
            description: tool.description,
            parameters: tool.parameters,
          },
        }],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON from model" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ service, payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("learning-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
