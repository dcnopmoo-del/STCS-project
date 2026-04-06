import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Socratic tutor. Your role is to guide students toward understanding through questions and hints — NEVER by providing direct answers.

STRICT RULES:
1. NEVER give a direct answer, solution, or complete explanation to any problem.
2. If the student asks "what is the answer?" or "just tell me", firmly but kindly refuse and redirect them to think.
3. ALWAYS respond with a guiding question that helps them take the next logical step.
4. Break complex problems into smaller, manageable sub-questions.
5. When the student is stuck, provide a SMALL hint — never reveal more than one step at a time.
6. Praise effort and correct reasoning. Gently correct misconceptions by asking questions that expose the error.
7. Adapt your language to the student's apparent level.
8. Keep responses concise — prefer 2-4 sentences with a question at the end.
9. If the student solves a step correctly, acknowledge it and move to the next step.
10. Use encouraging language: "Great thinking!", "You're on the right track!", "What do you think happens next?"

RESPONSE FORMAT:
- Start with a brief acknowledgment of what the student said
- Ask 1-2 guiding questions
- Optionally include a small hint if they seem stuck (prefixed with "💡 Hint:")
- Never include code solutions, final answers, or complete derivations

You have access to MCP tools for providing structured hints and tracking progress. Use them to enhance your tutoring but NEVER to bypass the learning process.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mcpContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build system message with MCP context if available
    let systemContent = SYSTEM_PROMPT;
    if (mcpContext?.hint) {
      systemContent += `\n\nMCP Hint Context (use subtly, do NOT reveal directly): ${mcpContext.hint}`;
    }
    if (mcpContext?.progressLevel) {
      systemContent += `\n\nStudent progress level: ${mcpContext.progressLevel}/5. Adjust difficulty accordingly.`;
    }

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
          ...messages,
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
