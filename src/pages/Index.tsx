import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput, { type ChatAttachment } from "@/components/ChatInput";
import ChatSidebar, { type Conversation } from "@/components/ChatSidebar";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import QuickActions from "@/components/QuickActions";
import EmptyState from "@/components/EmptyState";
import LearningServiceBar from "@/components/LearningServiceBar";
import LearningTopicDialog from "@/components/LearningTopicDialog";
import { streamChat, type Message } from "@/lib/chat-api";
import { callLearningTool, encodeLearningMessage, type LearningService, SERVICE_LABELS } from "@/lib/learning-tools";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { useLanguage } from "@/hooks/use-language";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    conversations,
    setConversations,
    activeId,
    setActiveId,
    active,
    newConversation,
    persistConversation,
    welcomeMessage,
  } = useConversations(user);

  const { language, setLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeService, setActiveService] = useState<LearningService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const messages = active.messages;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (input: string, attachment?: ChatAttachment) => {
    const userMsg: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    const newTitle = messages.length <= 1 ? input.slice(0, 40) + (input.length > 40 ? "…" : "") : active.title;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, title: newTitle, messages: updatedMessages, updatedAt: new Date() } : c
      )
    );

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
        messages: updatedMessages.filter((m) => m !== welcomeMessage),
        language,
        attachment: attachment
          ? { name: attachment.name, mimeType: attachment.mimeType, base64: attachment.base64 }
          : undefined,
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsLoading(false);
          // Persist the user message + assistant response
          if (user) {
            const conv = { ...active, title: newTitle };
            const finalAssistantMsg: Message = { role: "assistant", content: assistantSoFar };
            await persistConversation(conv, [userMsg, finalAssistantMsg]);
          }
        },
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

  const handleLearningSubmit = async (input: string) => {
    if (!activeService) return;
    const service = activeService;
    setActiveService(null);

    const isAr = language === "ar";
    const meta = SERVICE_LABELS[service];
    const userText = isAr
      ? `${meta.ar}: ${input}`
      : `${meta.en}: ${input}`;
    const userMsg: Message = { role: "user", content: userText };
    const updatedMessages = [...messages, userMsg];
    const newTitle = messages.length <= 1 ? userText.slice(0, 40) + (userText.length > 40 ? "…" : "") : active.title;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, title: newTitle, messages: updatedMessages, updatedAt: new Date() } : c
      )
    );
    setIsLoading(true);

    try {
      const result = await callLearningTool(service, input, language);
      const assistantContent = encodeLearningMessage(result);
      const assistantMsg: Message = { role: "assistant", content: assistantContent };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: [...updatedMessages, assistantMsg], updatedAt: new Date() }
            : c
        )
      );
      setIsLoading(false);

      if (user) {
        const conv = { ...active, title: newTitle };
        await persistConversation(conv, [userMsg, assistantMsg]);
      }
    } catch (err) {
      setIsLoading(false);
      toast({
        title: "Couldn't generate content",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
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
        onNew={newConversation}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user?.email}
        onSignOut={signOut}
        onLogin={() => navigate("/auth")}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <ChatHeader onMenuClick={() => setSidebarOpen(true)} language={language} onLanguageChange={setLanguage} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {showEmptyState ? (
              <>
                <ChatMessage role="assistant" content={welcomeMessage.content} />
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
            <LearningServiceBar
              onSelect={setActiveService}
              disabled={isLoading}
              language={language}
            />
            {hasActiveMessages && <QuickActions onSend={handleSend} disabled={isLoading} />}
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>

      <LearningTopicDialog
        service={activeService}
        language={language}
        onClose={() => setActiveService(null)}
        onSubmit={handleLearningSubmit}
      />
    </div>
  );
};

export default Index;
