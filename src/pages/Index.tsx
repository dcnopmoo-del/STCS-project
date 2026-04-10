import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatSidebar, { type Conversation } from "@/components/ChatSidebar";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import QuickActions from "@/components/QuickActions";
import EmptyState from "@/components/EmptyState";
import { streamChat, type Message } from "@/lib/chat-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "👋 Welcome! I'm your Socratic tutor. I'm here to help you **think through problems** — not to give you answers.\n\nTell me what you're working on, and I'll guide you step by step.",
};

type ConversationData = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
};

const createConversation = (): ConversationData => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [WELCOME_MESSAGE],
  updatedAt: new Date(),
});

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationData[]>(() => [createConversation()]);
  const [activeId, setActiveId] = useState<string>(conversations[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const active = conversations.find((c) => c.id === activeId)!;
  const messages = active.messages;

  const updateMessages = useCallback(
    (updater: (msgs: Message[]) => Message[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, messages: updater(c.messages), updatedAt: new Date() } : c
        )
      );
    },
    [activeId]
  );

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (input: string) => {
    const userMsg: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];

    if (messages.length <= 1) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, title: input.slice(0, 40) + (input.length > 40 ? "…" : ""), messages: updatedMessages, updatedAt: new Date() } : c
        )
      );
    } else {
      updateMessages(() => updatedMessages);
    }

    setIsLoading(true);
    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      const snap = assistantSoFar;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const msgs = c.messages;
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant" && msgs.length > updatedMessages.length) {
            return { ...c, messages: msgs.map((m, i) => (i === msgs.length - 1 ? { ...m, content: snap } : m)) };
          }
          return { ...c, messages: [...msgs.slice(0, updatedMessages.length), { role: "assistant" as const, content: snap }] };
        })
      );
    };

    try {
      await streamChat({
        messages: updatedMessages.filter((m) => m !== WELCOME_MESSAGE),
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (error) => {
          setIsLoading(false);
          toast({ title: "Something went wrong", description: error, variant: "destructive" });
        },
      });
    } catch {
      setIsLoading(false);
      toast({ title: "Connection error", description: "Couldn't reach the tutor. Please try again.", variant: "destructive" });
    }
  };

  const handleNewConversation = () => {
    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  };

  const showEmptyState = messages.length <= 1;
  const hasActiveMessages = messages.length > 1;
  const isThinking = isLoading && (messages[messages.length - 1]?.role === "user" || !messages[messages.length - 1]?.content);

  const groupedMessages = messages.map((msg, i) => ({
    ...msg,
    isGrouped: i > 0 && messages[i - 1].role === msg.role,
  }));

  const sidebarConversations: Conversation[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
  }));

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={sidebarConversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNewConversation}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user?.email}
        onSignOut={signOut}
        onLogin={() => navigate("/auth")}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <ChatHeader onMenuClick={() => setSidebarOpen(true)} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {showEmptyState ? (
              <>
                <ChatMessage role="assistant" content={WELCOME_MESSAGE.content} />
                <EmptyState onSend={handleSend} />
              </>
            ) : (
              groupedMessages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} isGrouped={msg.isGrouped} />
              ))
            )}
            {isThinking && <ThinkingIndicator />}
          </div>
        </div>

        <div className="border-t bg-card/80 backdrop-blur-sm px-4 py-3">
          <div className="mx-auto max-w-2xl space-y-2">
            {hasActiveMessages && <QuickActions onSend={handleSend} disabled={isLoading} />}
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
