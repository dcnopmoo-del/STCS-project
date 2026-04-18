import { ArrowRight, Lightbulb } from "lucide-react";
import type { AnalogyPayload } from "@/lib/learning-tools";

const AnalogyCard = ({ data }: { data: AnalogyPayload }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Lightbulb className="h-4 w-4 text-amber-500" />
      <h4 className="text-sm font-semibold text-foreground">{data.concept}</h4>
    </div>
    <div className="rounded-xl border bg-gradient-to-br from-amber-500/5 to-card p-4">
      <p className="text-sm font-medium italic text-foreground">"{data.analogy}"</p>
    </div>
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Why it works</p>
      <p className="text-sm text-foreground">{data.explanation}</p>
    </div>
    {data.mapping?.length > 0 && (
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mapping</p>
        {data.mapping.map((m, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs">
            <span className="flex-1 text-muted-foreground">{m.from}</span>
            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
            <span className="flex-1 text-right font-medium text-foreground">{m.to}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default AnalogyCard;
