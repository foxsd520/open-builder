import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { SendHorizonal, Square, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "../../i18n";

const SLASH_COMMANDS = ["new", "fork", "clear", "compact", "review", "retry"] as const;

interface ChatInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onStop: () => void;
  isGenerating: boolean;
  images: string[];
  onImagesChange: (images: string[]) => void;
  onSlashCommand: (cmd: string) => void;
}

export function ChatInput({
  input,
  onChange,
  onSubmit,
  onStop,
  isGenerating,
  images,
  onImagesChange,
  onSlashCommand,
}: ChatInputProps) {
  const t = useT();
  const [isHoveringStop, setIsHoveringStop] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slash menu: show when input starts with "/" and has no spaces
  const slashMatch = /^\/(\S*)$/.exec(input);
  const filteredCmds = useMemo(() => {
    if (!slashMatch) return [];
    const q = slashMatch[1].toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.startsWith(q));
  }, [slashMatch?.[1]]);
  const showSlashMenu = filteredCmds.length > 0 && !isGenerating;

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIdx(0);
  }, [filteredCmds.length]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  // Reset textarea height when input is cleared (e.g. after submit)
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % filteredCmds.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + filteredCmds.length) % filteredCmds.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onSlashCommand(filteredCmds[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onChange("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) form.requestSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) readFileAsDataURL(file);
        return;
      }
    }
  };

  const readFileAsDataURL = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImagesChange([...images, reader.result]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(readFileAsDataURL);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const hasContent = input.trim() || images.length > 0;

  return (
    <div className="p-2 bg-background shrink-0">
      <form onSubmit={onSubmit}>
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((src, i) => (
              <div
                key={i}
                className="relative group w-16 h-16 rounded-lg overflow-hidden border"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          {showSlashMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-md overflow-hidden z-10">
              {filteredCmds.map((cmd, i) => (
                <button
                  key={cmd}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors cursor-pointer ${i === selectedIdx ? "bg-accent" : "hover:bg-accent/50"}`}
                  onMouseEnter={() => setSelectedIdx(i)}
                  onClick={() => onSlashCommand(cmd)}
                >
                  <span className="font-mono text-xs text-muted-foreground">{t.slash[cmd].name}</span>
                  <span className="text-muted-foreground">{t.slash[cmd].desc}</span>
                </button>
              ))}
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              onChange(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={t.chat.placeholder}
            rows={1}
            disabled={isGenerating}
            className="pr-20 md:text-base resize-none overflow-y-auto min-h-0"
            style={{ maxHeight: 200 }}
          />
          <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
            {!isGenerating && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground"
                  title={t.chat.uploadImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={16} />
                </Button>
              </>
            )}
            {isGenerating ? (
              <Button
                type="button"
                size="icon"
                onClick={onStop}
                variant={isHoveringStop ? "destructive" : "secondary"}
                className="w-7 h-7 transition-all duration-200 rounded-full"
                title={t.chat.stopGeneration}
                onMouseEnter={() => setIsHoveringStop(true)}
                onMouseLeave={() => setIsHoveringStop(false)}
              >
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isHoveringStop ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
                >
                  <Loader2 size={16} className="animate-spin" />
                </span>
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isHoveringStop ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                >
                  <Square size={14} fill="currentColor" />
                </span>
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!hasContent}
                className="w-7 h-7"
                title={t.chat.send}
              >
                <SendHorizonal size={16} />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
