import { Bot } from "lucide-react";

const TypingIndicator = () => (
  <div className="flex gap-3 animate-fade-in-up">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
      <Bot className="h-4 w-4 text-accent-foreground" />
    </div>
    <div className="flex items-center gap-1 rounded-2xl bg-tutor-bubble px-4 py-3">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
    </div>
  </div>
);

export default TypingIndicator;
