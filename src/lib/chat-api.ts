export type Attachment = {
  name: string;
  mimeType: string;
  base64: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-chat`;
const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-tutor`;

export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  try {
    const response = await fetch(MCP_URL, {
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
        params: { name: toolName, arguments: args },
      }),
    });
    const text = await response.text();
    // MCP server returns SSE format: "data: {json}\n\n"
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));
    for (const line of lines) {
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const data = JSON.parse(jsonStr);
        if (data.result?.content?.[0]?.text) {
          return JSON.parse(data.result.content[0].text);
        }
      } catch { /* skip */ }
    }
    return null;
  } catch (e) {
    console.error("MCP call failed:", e);
    return null;
  }
}

export async function getMcpContext(messages: Message[]): Promise<{ hint?: string; progressLevel?: number }> {
  const messageCount = messages.length;
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || "";

  // Call MCP tools in parallel for context
  const [progressResult, hintResult] = await Promise.all([
    callMcpTool("assess_progress", {
      messageCount,
      correctSteps: Math.floor(messageCount * 0.4), // approximate
      topic: "general",
    }),
    callMcpTool("get_structured_hint", {
      topic: "general",
      hintLevel: Math.min(Math.ceil(messageCount / 4), 5),
      studentAttempt: lastUserMessage,
    }),
  ]);

  const context: { hint?: string; progressLevel?: number } = {};
  if (hintResult && typeof hintResult === "object" && "hint" in hintResult) {
    context.hint = (hintResult as { hint: string }).hint;
  }
  if (progressResult && typeof progressResult === "object" && "progressLevel" in progressResult) {
    context.progressLevel = (progressResult as { progressLevel: number }).progressLevel;
  }

  return context;
}

export async function streamChat({
  messages,
  language,
  attachment,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  language?: "auto" | "en" | "ar";
  attachment?: Attachment;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  // Get MCP context first
  const mcpContext = await getMcpContext(messages);

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mcpContext, language: language ?? "auto", attachment }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
    onError(errorData.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
