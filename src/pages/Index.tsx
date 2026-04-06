import { useState, useRef, useEffect, useCallback } from "react";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import { streamChat, type Message } from "@/lib/chat-api";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, BookOpen, Target } from "lucide-react";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "👋 Welcome! I'm your Socratic tutor. I'm here to help you **think through problems** — not to give you answers.\n\nTell me what you're working on, and I'll guide you step by step. What would you like to learn today?",
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (input: string) => {
    const userMsg: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > updatedMessages.length) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev.slice(0, updatedMessages.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: updatedMessages.filter((m) => m !== WELCOME_MESSAGE),
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (error) => {
          setIsLoading(false);
          toast({ title: "Error", description: error, variant: "destructive" });
        },
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      toast({ title: "Error", description: "Failed to connect to tutor", variant: "destructive" });
    }
  };

  const showEmptyState = messages.length <= 1;

  return (
    <div className="flex h-screen flex-col bg-background">
      <ChatHeader />

      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && !messages[messages.length - 1]?.content && <TypingIndicator />}

          {showEmptyState && (
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Lightbulb, label: "Solve a math problem", prompt: "I need help solving a quadratic equation" },
                { icon: BookOpen, label: "Understand a concept", prompt: "Can you help me understand how photosynthesis works?" },
                { icon: Target, label: "Debug my code", prompt: "I have a bug in my Python code and I can't figure out what's wrong" },
              ].map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => handleSend(prompt)}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-card px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
