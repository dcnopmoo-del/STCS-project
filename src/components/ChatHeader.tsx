import { GraduationCap } from "lucide-react";

const ChatHeader = () => (
  <header className="flex items-center gap-3 border-b bg-card px-6 py-4">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
      <GraduationCap className="h-5 w-5 text-primary-foreground" />
    </div>
    <div>
      <h1 className="text-base font-semibold text-foreground">Socratic Tutor</h1>
      <p className="text-xs text-muted-foreground">
        I guide you to answers — I never give them away
      </p>
    </div>
  </header>
);

export default ChatHeader;
