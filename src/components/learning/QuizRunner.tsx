import { useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizPayload } from "@/lib/learning-tools";
import { cn } from "@/lib/utils";

const QuizRunner = ({ data }: { data: QuizPayload }) => {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const total = data.questions.length;
  const q = data.questions[index];

  const reset = () => {
    setIndex(0); setSelected(null); setAnswers([]); setDone(false);
  };

  const next = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  };

  if (done) {
    const score = answers.reduce((s, a, i) => s + (a === data.questions[i].correctIndex ? 1 : 0), 0);
    const wrong = data.questions.map((q, i) => ({ q, i, picked: answers[i] })).filter(({ q, picked }) => picked !== q.correctIndex);
    return (
      <div className="space-y-3">
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-accent/30 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your score</p>
          <p className="text-3xl font-bold text-foreground">{score} / {total}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {score === total ? "Perfect! 🎉" : score >= total * 0.6 ? "Nice work!" : "Keep practicing!"}
          </p>
        </div>
        {wrong.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review</p>
            {wrong.map(({ q, i, picked }) => (
              <div key={i} className="rounded-lg border bg-card p-3 text-sm">
                <p className="font-medium text-foreground">{q.question}</p>
                <p className="mt-1 text-xs text-destructive">Your answer: {q.options[picked]}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Correct: {q.options[q.correctIndex]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{q.explanation}</p>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={reset} className="w-full gap-1">
          <RotateCcw className="h-3.5 w-3.5" /> Retake Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">🧠 {data.topic}</h4>
        <span className="text-xs text-muted-foreground">Q{index + 1} / {total}</span>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-medium text-foreground">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left text-sm transition-all",
                selected === i
                  ? "border-primary bg-primary/10 text-foreground"
                  : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {selected !== null && (
        <div className={cn(
          "rounded-lg border p-3 text-xs",
          selected === q.correctIndex
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        )}>
          <div className="flex items-start gap-2">
            {selected === q.correctIndex ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
            <div>
              <p className="font-semibold">
                {selected === q.correctIndex ? "Correct!" : `Correct answer: ${q.options[q.correctIndex]}`}
              </p>
              <p className="mt-0.5 opacity-90">{q.explanation}</p>
            </div>
          </div>
        </div>
      )}
      <Button onClick={next} disabled={selected === null} size="sm" className="w-full">
        {index + 1 >= total ? "Finish" : "Next Question"}
      </Button>
    </div>
  );
};

export default QuizRunner;
