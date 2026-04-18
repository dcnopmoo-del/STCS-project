import { Network } from "lucide-react";
import type { ConceptMapPayload, ConceptNode } from "@/lib/learning-tools";

const NodeBranch = ({ node, depth }: { node: ConceptNode; depth: number }) => {
  const colors = [
    "border-primary/60 bg-primary/10 text-foreground font-semibold",
    "border-blue-400/40 bg-blue-500/5 text-foreground",
    "border-border bg-card text-muted-foreground",
  ];
  const cls = colors[Math.min(depth, colors.length - 1)];
  return (
    <li className="relative pl-4">
      <span className="absolute left-0 top-3 h-px w-3 bg-border" />
      <div className={`inline-block rounded-lg border px-2.5 py-1 text-xs ${cls}`}>
        {node.label}
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="ml-2 mt-1.5 space-y-1.5 border-l border-dashed border-border">
          {node.children.map((child, i) => (
            <NodeBranch key={i} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const ConceptMap = ({ data }: { data: ConceptMapPayload }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Network className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold text-foreground">Concept Map: {data.topic}</h4>
    </div>
    <div className="rounded-xl border bg-gradient-to-br from-card to-accent/20 p-3">
      <div className="inline-block rounded-lg border-2 border-primary bg-primary/15 px-3 py-1.5 text-sm font-bold text-foreground">
        {data.root.label}
      </div>
      {data.root.children && data.root.children.length > 0 && (
        <ul className="ml-3 mt-2 space-y-2 border-l border-dashed border-border">
          {data.root.children.map((child, i) => (
            <NodeBranch key={i} node={child} depth={1} />
          ))}
        </ul>
      )}
    </div>
  </div>
);

export default ConceptMap;
