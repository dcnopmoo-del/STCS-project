import { useId } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User, Volume2, Square } from "lucide-react";
import { decodeLearningMessage } from "@/lib/learning-tools";
import LearningRenderer from "@/components/learning/LearningRenderer";
import { useSpeechSynthesis } from "@/hooks/use-speech";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  isGrouped?: boolean;
};

const ChatMessage = ({ role, content, isGrouped = false }: ChatMessageProps) => {
  const isUser = role === "user";
  const learning = !isUser ? decodeLearningMessage(content) : null;
  const msgId = useId();
  const { speak, stop, speakingId, supported: ttsSupported } = useSpeechSynthesis();
  const isSpeaking = speakingId === msgId;
  const canSpeak = !isUser && !learning && ttsSupported && content.trim().length > 0;

  return (
    <div
      className={`flex gap-3 animate-fade-in-up ${
        isUser ? "flex-row-reverse" : "flex-row"
      } ${isGrouped ? "mt-1" : "mt-4 first:mt-0"}`}
    >
      {/* Avatar */}
      {!isGrouped ? (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
            isUser
              ? "bg-primary"
              : "bg-accent border border-border"
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-accent-foreground" />
          )}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-2.5 shadow-sm ${
          isUser
            ? "bg-user-bubble text-user-bubble-foreground rounded-2xl rounded-tr-md"
            : "bg-tutor-bubble text-tutor-bubble-foreground rounded-2xl rounded-tl-md border border-border/50"
        } ${isGrouped && isUser ? "rounded-tr-2xl rounded-br-md" : ""}
          ${isGrouped && !isUser ? "rounded-tl-2xl rounded-bl-md" : ""}`}
      >
        {learning ? (
          <div className="min-w-[260px]">
            <LearningRenderer data={learning} />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-muted prose-pre:rounded-xl">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        {canSpeak && (
          <button
            type="button"
            onClick={() => (isSpeaking ? stop() : speak(msgId, content))}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
            title={isSpeaking ? "Stop" : "Read aloud"}
          >
            {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            {isSpeaking ? "Stop" : "Listen"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
