import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/lib/chat-api";
import type { User } from "@supabase/supabase-js";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "👋 Welcome! I'm your Socratic tutor. I'm here to help you **think through problems** — not to give you answers.\n\nTell me what you're working on, and I'll guide you step by step.",
};

export type ConversationData = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  persisted: boolean; // whether it exists in DB
};

const createLocal = (): ConversationData => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [WELCOME_MESSAGE],
  updatedAt: new Date(),
  persisted: false,
});

export function useConversations(user: User | null) {
  const [conversations, setConversations] = useState<ConversationData[]>(() => [createLocal()]);
  const [activeId, setActiveId] = useState<string>(conversations[0].id);
  const [loaded, setLoaded] = useState(false);

  // Load conversations from DB when user changes
  useEffect(() => {
    if (!user) {
      // Guest mode: reset to a fresh local conversation
      const fresh = createLocal();
      setConversations([fresh]);
      setActiveId(fresh.id);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: convRows } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (!convRows || convRows.length === 0) {
        const fresh = createLocal();
        setConversations([fresh]);
        setActiveId(fresh.id);
        setLoaded(true);
        return;
      }

      // Load messages for all conversations
      const ids = convRows.map((c) => c.id);
      const { data: msgRows } = await supabase
        .from("messages")
        .select("conversation_id, role, content, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      const msgMap = new Map<string, Message[]>();
      for (const m of msgRows || []) {
        const arr = msgMap.get(m.conversation_id) || [];
        arr.push({ role: m.role as "user" | "assistant", content: m.content });
        msgMap.set(m.conversation_id, arr);
      }

      const loaded: ConversationData[] = convRows.map((c) => ({
        id: c.id,
        title: c.title,
        messages: [WELCOME_MESSAGE, ...(msgMap.get(c.id) || [])],
        updatedAt: new Date(c.updated_at),
        persisted: true,
      }));

      setConversations(loaded);
      setActiveId(loaded[0].id);
      setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const active = conversations.find((c) => c.id === activeId) || conversations[0];

  const persistConversation = useCallback(
    async (conv: ConversationData, newMessages: Message[]) => {
      if (!user) return;

      const nonWelcome = newMessages.filter((m) => m !== WELCOME_MESSAGE && m.content !== WELCOME_MESSAGE.content);
      if (nonWelcome.length === 0) return;

      try {
        // Use upsert to safely handle the first-message race and avoid duplicate-key errors
        // if persistConversation is called concurrently for the same conversation.
        const { error: convErr } = await supabase
          .from("conversations")
          .upsert(
            { id: conv.id, user_id: user.id, title: conv.title, updated_at: new Date().toISOString() },
            { onConflict: "id" }
          );
        if (convErr) {
          console.error("Failed to upsert conversation:", convErr);
          return;
        }

        // Mark this conversation as persisted in React state so future calls take the update path.
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, persisted: true } : c))
        );

        const toInsert = nonWelcome.map((m) => ({
          conversation_id: conv.id,
          role: m.role,
          content: m.content,
        }));

        if (toInsert.length > 0) {
          const { error: msgErr } = await supabase.from("messages").insert(toInsert);
          if (msgErr) console.error("Failed to insert messages:", msgErr);
        }
      } catch (e) {
        console.error("persistConversation error:", e);
      }
    },
    [user]
  );

  const newConversation = useCallback(() => {
    const conv = createLocal();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  }, []);

  return {
    conversations,
    setConversations,
    activeId,
    setActiveId,
    active,
    newConversation,
    persistConversation,
    loaded,
    welcomeMessage: WELCOME_MESSAGE,
  };
}
