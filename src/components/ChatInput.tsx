import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileText, Image as ImageIcon, FileType, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech";

export type ChatAttachment = {
  name: string;
  mimeType: string;
  base64: string; // raw base64, no data: prefix
  size: number;
};

type ChatInputProps = {
  onSend: (message: string, attachment?: ChatAttachment) => void;
  disabled?: boolean;
};

const ACCEPTED = ".pdf,.txt,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

const getKind = (mime: string): { label: string; Icon: typeof FileText } => {
  if (mime.startsWith("image/")) return { label: "Image", Icon: ImageIcon };
  if (mime === "application/pdf") return { label: "PDF", Icon: FileType };
  return { label: "Text", Icon: FileText };
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { listening, start: startListening, stop: stopListening, supported: micSupported } =
    useSpeechRecognition((transcript) => {
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    });

  const handleMicClick = () => {
    if (!micSupported) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support speech recognition. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }
    if (listening) stopListening();
    else startListening();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachment) || disabled) return;
    onSend(trimmed || (attachment ? `[${attachment.name}]` : ""), attachment ?? undefined);
    setInput("");
    setAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({
        title: "File too large",
        description: "File too large. Please upload a file under 10MB.",
        variant: "destructive",
      });
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setAttachment({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
        size: file.size,
      });
    } catch {
      toast({ title: "Couldn't read file", description: "Please try again.", variant: "destructive" });
    }
  };

  const kind = attachment ? getKind(attachment.mimeType) : null;

  return (
    <div className="space-y-2">
      {attachment && kind && (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-sm animate-fade-in-up">
          <kind.Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate flex-1" title={attachment.name}>{attachment.name}</span>
          <Badge variant="secondary" className="shrink-0">{kind.label}</Badge>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="rounded-full p-1 hover:bg-background transition-colors shrink-0"
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleMicClick}
          disabled={disabled}
          className={`h-9 w-9 shrink-0 rounded-xl ${
            listening
              ? "text-destructive bg-destructive/10 hover:bg-destructive/15 animate-pulse"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={listening ? "Stop recording" : "Start voice input"}
          title={listening ? "Stop recording" : "Voice input"}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or describe your problem..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || (!input.trim() && !attachment)}
          className="h-9 w-9 shrink-0 rounded-xl transition-transform active:scale-95"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
