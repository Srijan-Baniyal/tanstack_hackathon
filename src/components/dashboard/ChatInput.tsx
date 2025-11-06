import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Smile, Send } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  onSendMessage?: (message: string) => void | Promise<void>;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      <div className="absolute -inset-1 bg-linear-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-xl opacity-50" />
      <div className="relative border-2 border-border/50 rounded-2xl p-4 md:p-5 bg-card/80 backdrop-blur-sm shadow-xl">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          disabled={disabled}
          className="min-h-[100px] md:min-h-[120px] resize-none border-0 p-0 focus-visible:ring-0 text-base leading-relaxed placeholder:text-muted-foreground/60 bg-transparent"
        />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="size-10 rounded-xl hover:bg-accent/80 hover:scale-105 transition-all"
            >
              <Paperclip className="size-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="size-10 rounded-xl hover:bg-accent/80 hover:scale-105 transition-all"
            >
              <Smile className="size-5" />
              <span className="sr-only">Add emoji</span>
            </Button>
          </div>
          <Button
            size="lg"
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="rounded-xl px-6 h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all bg-linear-to-r from-primary to-primary/90"
          >
            <Send className="size-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
}
