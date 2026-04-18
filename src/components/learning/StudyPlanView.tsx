import { Calendar, CheckCircle2 } from "lucide-react";
import type { StudyPlanPayload } from "@/lib/learning-tools";

const StudyPlanView = ({ data }: { data: StudyPlanPayload }) => {
  const fmt = (iso: string) => {
    try {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    } catch { return iso; }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Study Plan</h4>
        </div>
        <span className="text-xs text-muted-foreground">Exam: {fmt(data.examDate)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {data.topics.map((t, i) => (
          <span key={i} className="rounded-full border bg-accent px-2 py-0.5 text-xs text-foreground">
            {t}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {data.days.map((day, i) => (
          <div key={i} className="rounded-xl border bg-card p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{fmt(day.date)}</span>
              <span className="text-xs text-primary">{day.focus}</span>
            </div>
            <ul className="space-y-1">
              {day.activities.map((a, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyPlanView;
