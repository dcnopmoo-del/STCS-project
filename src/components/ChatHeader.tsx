import { GraduationCap, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/LanguageToggle";
import type { LanguagePref } from "@/hooks/use-language";

type ChatHeaderProps = {
  onMenuClick?: () => void;
  language: LanguagePref;
  onLanguageChange: (lang: LanguagePref) => void;
};

const ChatHeader = ({ onMenuClick, language, onLanguageChange }: ChatHeaderProps) => (
  <header className="flex items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4 py-3 md:px-6">
    {onMenuClick && (
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
    )}
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
      <GraduationCap className="h-5 w-5 text-primary-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <h1 className="text-sm font-semibold text-foreground">Socratic Tutor</h1>
      <p className="text-xs text-muted-foreground">Guiding you to answers</p>
    </div>
    <LanguageToggle language={language} onChange={onLanguageChange} />
  </header>
);

export default ChatHeader;
