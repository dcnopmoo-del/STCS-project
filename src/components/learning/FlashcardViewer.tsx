import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlashcardsPayload } from "@/lib/learning-tools";

const FlashcardViewer = ({ data }: { data: FlashcardsPayload }) => {
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const card = data.cards[index];
  const total = data.cards.length;

  const go = (dir: number) => {
    setShowBack(false);
    setIndex((i) => (i + dir + total) % total);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">📇 {data.topic}</h4>
        <span className="text-xs text-muted-foreground">{index + 1} / {total}</span>
      </div>
      <button
        onClick={() => setShowBack((s) => !s)}
        className="group relative flex min-h-[140px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-card to-accent/30 p-6 text-center transition-all hover:border-primary/60 hover:shadow-md"
      >
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {showBack ? "Back" : "Front"}
          </p>
          <p className="text-base font-medium text-foreground">
            {showBack ? card.back : card.front}
          </p>
          {!showBack && (
            <p className="text-xs text-primary opacity-70 group-hover:opacity-100">
              Tap to reveal answer
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => go(-1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowBack((s) => !s)} className="gap-1">
          <RotateCcw className="h-3.5 w-3.5" />
          {showBack ? "Hide" : "Show"} Answer
        </Button>
        <Button variant="outline" size="sm" onClick={() => go(1)} className="gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default FlashcardViewer;
