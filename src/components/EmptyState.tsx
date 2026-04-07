import { Lightbulb, BookOpen, Target, Code } from "lucide-react";

type EmptyStateProps = {
  onSend: (message: string) => void;
};

const suggestions = [
  { icon: Lightbulb, label: "Solve a math problem", prompt: "I need help solving a quadratic equation", color: "text-amber-500" },
  { icon: BookOpen, label: "Understand a concept", prompt: "Can you help me understand how photosynthesis works?", color: "text-emerald-500" },
  { icon: Target, label: "Practice for an exam", prompt: "I want to practice problems for my physics exam on kinematics", color: "text-blue-500" },
  { icon: Code, label: "Debug my code", prompt: "I have a bug in my Python code and I can't figure out what's wrong", color: "text-violet-500" },
];

const EmptyState = ({ onSend }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="mb-8 text-center">
      <h2 className="text-xl font-semibold text-foreground mb-2">What would you like to learn?</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        I'll guide you step by step — helping you think through problems without giving away the answers.
      </p>
    </div>
    <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
      {suggestions.map(({ icon: Icon, label, prompt, color }) => (
        <button
          key={label}
          onClick={() => onSend(prompt)}
          className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left text-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="font-medium text-foreground">{label}</span>
        </button>
      ))}
    </div>
  </div>
);

export default EmptyState;
