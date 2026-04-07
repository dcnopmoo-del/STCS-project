import { Bot } from "lucide-react";

const TypingIndicator = () => (
  <div className="flex gap-3 animate-fade-in-up mt-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent border border-border shadow-sm">
      <Bot className="h-4 w-4 text-accent-foreground" />
    </div>
    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-tutor-bubble border border-border/50 px-4 py-3 shadow-sm">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
    </div>
  </div>
);

export default TypingIndicator;
