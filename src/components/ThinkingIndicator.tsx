import { Bot, Brain } from "lucide-react";

const ThinkingIndicator = () => (
  <div className="flex gap-3 animate-fade-in-up mt-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent border border-border shadow-sm">
      <Bot className="h-4 w-4 text-accent-foreground" />
    </div>
    <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-tutor-bubble border border-border/50 px-4 py-3 shadow-sm">
      <Brain className="h-4 w-4 text-primary animate-pulse" />
      <span className="text-sm text-muted-foreground">Thinking</span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
      </span>
    </div>
  </div>
);

export default ThinkingIndicator;
