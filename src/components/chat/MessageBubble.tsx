import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Lightbulb,
  GitCompareArrows,
  Undo2,
} from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import { ToolCallCard } from "./ToolCallCard";
import { useT } from "../../i18n";
import type { MergedMessage, TextBlock, ImageBlock } from "../../types";

interface MessageBubbleProps {
  message: MergedMessage;
  isGenerating?: boolean;
  isLastAssistant?: boolean;
  snapshotExists?: boolean;
  onShowDiff?: (messageId: string) => void;
  onRollback?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isGenerating = false,
  isLastAssistant = false,
  snapshotExists = false,
  onShowDiff,
  onRollback,
}: MessageBubbleProps) {
  const t = useT();
  if (message.role === "user") {
    const textBlocks = message.blocks.filter(
      (b): b is TextBlock => b.type === "text",
    );
    const imageBlocks = message.blocks.filter(
      (b): b is ImageBlock => b.type === "image",
    );

    return (
      <div className="flex justify-end">
        <div className="bg-secondary px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%]">
          {imageBlocks.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {imageBlocks.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="max-w-48 max-h-48 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
          {textBlocks.length > 0 && (
            <MarkdownContent
              content={textBlocks.map((b) => b.content).join("\n\n")}
              variant="user"
            />
          )}
        </div>
      </div>
    );
  }

  // Check if the last text block is an error message
  const lastTextBlock = [...message.blocks]
    .reverse()
    .find((b) => b.type === "text") as TextBlock | undefined;

  return (
    <div className="flex-1 min-w-0 space-y-2">
      {message.blocks.map((block) => {
        if (block.type === "thinking") {
          return (
            <ThinkingBlockCard
              key={block.id}
              content={block.content}
              isStreaming={isGenerating && isLastAssistant}
            />
          );
        }
        if (block.type === "text") {
          return (
            <div key={block.id} className="text-sm text-foreground">
              <MarkdownContent content={block.content} variant="assistant" />
            </div>
          );
        }
        if (block.type === "tool") {
          return <ToolCallCard key={block.id} {...block} />;
        }
        return null;
      })}
      {snapshotExists && !(isGenerating && isLastAssistant) && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
          <button
            onClick={() => onShowDiff?.(message.id)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            <span>Diff</span>
          </button>
          <button
            onClick={() => onRollback?.(message.id)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{t.message.rollback}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ThinkingBlockCard({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(isStreaming);

  // Auto-collapse when streaming ends
  useEffect(() => {
    if (!isStreaming) setExpanded(false);
  }, [isStreaming]);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/30">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Lightbulb className="w-3.5 h-3.5 text-purple-500" />
        <span className="font-medium text-xs text-foreground">{t.message.thinking}</span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        )}
      </button>
      {expanded && (
        <div className="thought px-3 py-2 text-xs text-muted-foreground max-h-60 overflow-y-auto">
          <MarkdownContent content={content} variant="assistant" />
        </div>
      )}
    </div>
  );
}
