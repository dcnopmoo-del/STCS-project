import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANGUAGE_RULES = {
  auto: `LANGUAGE RULE (CRITICAL):
- Detect the language of the student's most recent message.
- If the student writes in Arabic, respond ENTIRELY in Arabic (including hints, questions, explanations, prefixes — translate "💡 Hint:" to "💡 تلميح:", "🔍 Let me help you further:" to "🔍 دعني أساعدك أكثر:", "📝 Here's the solution:" to "📝 إليك الحل:").
- If the student writes in English, respond ENTIRELY in English.
- Never mix languages in a single response. Match the student's language exactly on every turn.`,
  en: `LANGUAGE RULE (CRITICAL):
- The user has manually selected English. Respond ONLY in English regardless of the language of their message.
- All hints, questions, explanations, and prefixes must be in English.`,
  ar: `LANGUAGE RULE (CRITICAL):
- لقد اختار المستخدم اللغة العربية يدويًا. أجب باللغة العربية فقط بغض النظر عن لغة رسالته.
- يجب أن تكون جميع التلميحات والأسئلة والشروحات والبادئات باللغة العربية.
- استخدم: "💡 تلميح:" بدلاً من "💡 Hint:"، و"🔍 دعني أساعدك أكثر:" بدلاً من "🔍 Let me help you further:"، و"📝 إليك الحل:" بدلاً من "📝 Here's the solution:".`,
} as const;

const SYSTEM_PROMPT = `You are a Socratic tutor. Your role is to guide students toward understanding through questions and hints.

ESCALATION STRATEGY (follow this progression strictly):

LEVEL 1 — GUIDING QUESTIONS (first 2-3 exchanges on a topic):
- Respond ONLY with guiding questions that help the student think.
- Break the problem into smaller sub-questions.
- Never reveal answers or give explicit hints yet.

LEVEL 2 — SMALL HINTS (after 3-4 exchanges without progress):
- Provide a small, targeted hint (prefixed with "💡 Hint:").
- Still ask a guiding question after the hint.
- Never reveal more than one step at a time.

LEVEL 3 — EXPLICIT HINTS (after 5-6 exchanges or if the student expresses frustration):
- Give more direct hints that clearly point toward the solution method.
- Explain the relevant concept briefly, then ask if they can apply it.
- Prefix with "🔍 Let me help you further:"

LEVEL 4 — PROVIDE THE ANSWER (LAST RESORT — only after ALL of these are true):
  a) You have already given at least 3 hints across previous messages
  b) The student has attempted the problem multiple times without success
  c) The student explicitly asks for the answer OR expresses clear frustration/confusion (e.g., "I give up", "I'm lost", "just tell me", "I don't understand at all")
- When providing the answer:
  - Prefix with "📝 Here's the solution:"
  - ALWAYS include a step-by-step explanation of HOW the answer is derived
  - Explain WHY each step works
  - End with a follow-up question to check understanding (e.g., "Does this make sense? Can you try a similar problem?")
  - Keep the tone supportive and educational

DETECTING FRUSTRATION:
- Look for phrases like: "I give up", "just tell me", "I can't figure this out", "I'm stuck", "this is too hard", "I don't get it", "please just show me"
- Also detect repeated wrong answers (3+ attempts at the same step)
- When frustration is detected, acknowledge it warmly before escalating

RESPONSE FORMAT:
- Start with a brief acknowledgment of what the student said
- Follow the appropriate escalation level above
- Use encouraging language: "Great thinking!", "You're on the right track!", "I know this is tricky, but you're making progress!"
- Adapt your language to the student's apparent level
- Keep responses concise — prefer 2-4 sentences with a question at the end (except Level 4)

You have access to MCP tools for providing structured hints and tracking progress. Use them to enhance your tutoring.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mcpContext, language, attachment } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langKey = (language === "en" || language === "ar") ? language : "auto";
    let systemContent = `${SYSTEM_PROMPT}\n\n${LANGUAGE_RULES[langKey]}`;
    if (mcpContext?.hint) {
      systemContent += `\n\nMCP Hint Context (use subtly, integrate into your escalation): ${mcpContext.hint}`;
    }
    if (mcpContext?.progressLevel !== undefined) {
      systemContent += `\n\nStudent progress level: ${mcpContext.progressLevel}/5. Current escalation context — adjust your response level accordingly. If progress is 1-2, stay at Level 1-2. If 3-4, move to Level 3. If 5, you may provide the answer (Level 4).`;
    }

    // If an attachment is present, transform the last user message into multimodal content
    const outgoingMessages = [...messages];
    if (attachment?.base64 && attachment?.mimeType) {
      const lastIdx = outgoingMessages.length - 1;
      const last = outgoingMessages[lastIdx];
      if (last && last.role === "user") {
        const dataUrl = `data:${attachment.mimeType};base64,${attachment.base64}`;
        const isImage = attachment.mimeType.startsWith("image/");
        const textPart = typeof last.content === "string" && last.content.trim()
          ? last.content
          : "Please analyze the attached file and help me understand it (without giving away the final answer).";

        if (isImage) {
          outgoingMessages[lastIdx] = {
            role: "user",
            content: [
              { type: "text", text: textPart },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          };
        } else {
          // PDFs and text files: send as a file part (Gemini via Lovable AI Gateway accepts file_url)
          outgoingMessages[lastIdx] = {
            role: "user",
            content: [
              { type: "text", text: `${textPart}\n\n(Attached file: ${attachment.name ?? "file"}, type: ${attachment.mimeType})` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          };
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemContent },
          ...outgoingMessages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
