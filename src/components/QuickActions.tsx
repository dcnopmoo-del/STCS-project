import { Lightbulb, ListChecks, HelpCircle, Sparkles } from "lucide-react";

type QuickActionsProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

const actions = [
  { icon: Lightbulb, label: "Give me a hint", prompt: "Can you give me a hint to help me think about this?" },
  { icon: ListChecks, label: "Step by step", prompt: "Can you break this down step by step for me?" },
  { icon: HelpCircle, label: "Explain concept", prompt: "Can you explain the underlying concept here?" },
  { icon: Sparkles, label: "Simplify", prompt: "Can you simplify this so it's easier to understand?" },
];

const QuickActions = ({ onSend, disabled }: QuickActionsProps) => (
  <div className="flex gap-2 overflow-x-auto pb-1 px-1 no-scrollbar">
    {actions.map(({ icon: Icon, label, prompt }) => (
      <button
        key={label}
        onClick={() => onSend(prompt)}
        disabled={disabled}
        className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:pointer-events-none shadow-sm"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </div>
);

export default QuickActions;
