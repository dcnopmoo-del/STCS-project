import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LearningService } from "@/lib/learning-tools";
import { SERVICE_LABELS } from "@/lib/learning-tools";

type Props = {
  service: LearningService | null;
  language: "auto" | "en" | "ar";
  onClose: () => void;
  onSubmit: (input: string) => void;
};

const LearningTopicDialog = ({ service, language, onClose, onSubmit }: Props) => {
  const [value, setValue] = useState("");
  const [topics, setTopics] = useState("");
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    setValue(""); setTopics(""); setExamDate("");
  }, [service]);

  if (!service) return null;
  const isAr = language === "ar";
  const meta = SERVICE_LABELS[service];
  const title = isAr ? meta.ar : meta.en;
  const prompt = isAr ? meta.promptAr : meta.promptEn;

  const handleSubmit = () => {
    let input = "";
    if (service === "study_plan") {
      if (!topics.trim() || !examDate.trim()) return;
      input = isAr
        ? `الموضوعات: ${topics}. تاريخ الامتحان: ${examDate}.`
        : `Topics: ${topics}. Exam date: ${examDate}.`;
    } else {
      if (!value.trim()) return;
      input = value.trim();
    }
    onSubmit(input);
  };

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{prompt}</DialogDescription>
        </DialogHeader>
        {service === "study_plan" ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {isAr ? "المواضيع (مفصولة بفواصل)" : "Topics (comma-separated)"}
              </label>
              <Textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder={isAr ? "الجبر، الهندسة، الإحصاء" : "Algebra, Geometry, Statistics"}
                rows={2}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {isAr ? "تاريخ الامتحان" : "Exam date"}
              </label>
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder={isAr ? "أدخل الموضوع..." : "Enter topic..."}
            autoFocus
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit}>
            {isAr ? "إنشاء" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LearningTopicDialog;
