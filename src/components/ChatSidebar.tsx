import { Plus, MessageSquare, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";

export type Conversation = {
  id: string;
  title: string;
  updatedAt: Date;
};

type ChatSidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  open: boolean;
  onClose: () => void;
  userEmail?: string;
  onSignOut?: () => void;
};

const ChatSidebar = ({ conversations, activeId, onSelect, onNew, open, onClose, userEmail, onSignOut }: ChatSidebarProps) => {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-card transition-transform duration-300 md:relative md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl md:hidden" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3">
          <Button onClick={onNew} className="w-full justify-start gap-2 rounded-xl" variant="outline">
            <Plus className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 chat-scroll">
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { onSelect(conv.id); onClose(); }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  activeId === conv.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User info & logout */}
        {userEmail && (
          <div className="border-t px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onSignOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default ChatSidebar;
