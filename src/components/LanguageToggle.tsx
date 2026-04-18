import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { LanguagePref } from "@/hooks/use-language";

type Props = {
  language: LanguagePref;
  onChange: (lang: LanguagePref) => void;
};

const labels: Record<LanguagePref, string> = {
  auto: "Auto",
  en: "English",
  ar: "العربية",
};

const LanguageToggle = ({ language, onChange }: Props) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded-full border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-label="Select language"
      >
        <Languages className="h-3.5 w-3.5" />
        {labels[language]}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-[140px]">
      <DropdownMenuItem onClick={() => onChange("auto")}>
        Auto-detect
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onChange("en")}>English</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onChange("ar")}>العربية</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default LanguageToggle;
