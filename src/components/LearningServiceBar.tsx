import { Layers, HelpCircle, Lightbulb, CalendarDays, Network } from "lucide-react";
import type { LearningService } from "@/lib/learning-tools";

type Props = {
  onSelect: (service: LearningService) => void;
  disabled?: boolean;
  language: "auto" | "en" | "ar";
};

const items: { service: LearningService; icon: typeof Layers; en: string; ar: string }[] = [
  { service: "flashcards", icon: Layers, en: "Flashcards", ar: "بطاقات" },
  { service: "quiz", icon: HelpCircle, en: "Quiz", ar: "اختبار" },
  { service: "analogy", icon: Lightbulb, en: "Analogy", ar: "تشبيه" },
  { service: "study_plan", icon: CalendarDays, en: "Study Plan", ar: "خطة" },
  { service: "concept_map", icon: Network, en: "Concept Map", ar: "خريطة" },
];

const LearningServiceBar = ({ onSelect, disabled, language }: Props) => {
  const labelKey = language === "ar" ? "ar" : "en";
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-1 no-scrollbar">
      {items.map(({ service, icon: Icon, en, ar }) => (
        <button
          key={service}
          onClick={() => onSelect(service)}
          disabled={disabled}
          className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-accent disabled:opacity-50 disabled:pointer-events-none shadow-sm"
        >
          <Icon className="h-3.5 w-3.5 text-primary" />
          {labelKey === "ar" ? ar : en}
        </button>
      ))}
    </div>
  );
};

export default LearningServiceBar;
