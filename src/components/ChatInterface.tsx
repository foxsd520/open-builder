import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Undo2 } from "lucide-react";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatInput } from "./chat/ChatInput";
import { EmptyState } from "./chat/EmptyState";
import { MessageBubble } from "./chat/MessageBubble";
import { MobilePreview } from "./chat/MobilePreview";
import { GeneratingIndicator } from "./chat/GeneratingIndicator";
import { SettingsWarning } from "./chat/SettingsWarning";
import { SessionList } from "./chat/SessionList";
import { DiffModal } from "./chat/DiffModal";
import { useMergedMessages } from "../hooks/useMergedMessages";
import { mergeMessages } from "../lib/mergeMessages";
import { useIsMobile } from "../hooks/useIsMobile";
import { useConversationStore } from "../store/conversation";
import { useSnapshotStore } from "../store/snapshot";
import { useT } from "../i18n";
import type { Message, ProjectFiles, ProjectSnapshot } from "../types";

const EMPTY_SNAPSHOTS: ProjectSnapshot[] = [];

/** Given a MergedMessage ID like "assistant-3", find the end index (exclusive)
 *  of that assistant group in the raw messages array. */
function findAssistantGroupEnd(messages: Message[], mergedId: string): number {
  const startIdx = parseInt(mergedId.replace("assistant-", ""), 10);
  if (isNaN(startIdx) || startIdx >= messages.length) return messages.length;
  let j = startIdx;
  while (
    j < messages.length &&
    (messages[j].role === "assistant" || messages[j].role === "tool")
  ) {
    j++;
  }
  return j;
}

/** Find the user message text right before a given merged assistant message */
function findPrecedingUserLabel(messages: Message[], mergedId: string): string {
  const merged = mergeMessages(messages);
  const idx = merged.findIndex((m) => m.id === mergedId);
  if (idx <= 0) return "";
  // Walk backwards to find the preceding user message
  for (let i = idx - 1; i >= 0; i--) {
    if (merged[i].role === "user") {
      const textBlock = merged[i].blocks.find((b) => b.type === "text");
      if (textBlock && "content" in textBlock) {
        const text = textBlock.content;
        return text.length > 30 ? text.slice(0, 30) + "..." : text;
      }
    }
  }
  return "";
}

interface ChatInterfaceProps {
  messages: Message[];
  isGenerating: boolean;
  hasValidSettings: boolean;
  onGenerate: (prompt: string, images?: string[]) => Promise<void>;
  onStop: () => void;
  onOpenSettings: () => void;
  onSetFiles: (files: ProjectFiles) => void;
  files: ProjectFiles;
  template: string;
  sandpackKey: number;
  isProjectInitialized: boolean;
  onCompressContext: () => Promise<void>;
  onRetry: () => Promise<void>;
  onReview: () => Promise<void>;
}

export function ChatInterface({
  messages,
  isGenerating,
  hasValidSettings,
  onGenerate,
  onStop,
  onOpenSettings,
  onSetFiles,
  files,
  template,
  sandpackKey,
  isProjectInitialized,
  onCompressContext,
  onRetry,
  onReview,
}: ChatInterfaceProps) {
  const t = useT();
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mergedMessages = useMergedMessages(messages);
  const isMobile = useIsMobile();

  const activeId = useConversationStore((s) => s.activeId);
  const compressFromIndex = useConversationStore((s) =>
    s.activeId
      ? (s.conversations[s.activeId]?.compressedContext?.fromIndex ?? -1)
      : -1,
  );
  const snapshots = useSnapshotStore((s) =>
    activeId ? (s.snapshots[activeId] ?? EMPTY_SNAPSHOTS) : EMPTY_SNAPSHOTS,
  );
  const snapshotMessageIds = useMemo(
    () => new Set(snapshots.map((s) => s.messageId)),
    [snapshots],
  );
  const [diffMessageId, setDiffMessageId] = useState<string | null>(null);
  const [rollbackConfirmId, setRollbackConfirmId] = useState<string | null>(
    null,
  );
  // Ephemeral rollback hint: { messageId, label }
  const [rollbackInfo, setRollbackInfo] = useState<{
    messageId: string;
    label: string;
  } | null>(null);

  /** Flush any pending manual edits into the latest snapshot */
  const flushSnapshotUpdate = useCallback(() => {
    if (activeId && snapshots.length > 0) {
      useSnapshotStore.getState().updateLatestSnapshot(activeId, files);
    }
  }, [activeId, snapshots.length, files]);

  const handleRollback = useCallback(
    (messageId: string) => {
      if (!activeId) return;
      // Flush manual edits into the current snapshot before rollback
      flushSnapshotUpdate();
      const snap = useSnapshotStore
        .getState()
        .getSnapshotByMessageId(activeId, messageId);
      if (!snap) return;
      const restoredFiles = useSnapshotStore
        .getState()
        .reconstructFiles(activeId, snap.id);
      onSetFiles(restoredFiles);
      setRollbackConfirmId(null);
      // Set rollback hint with preceding user message as label
      const label = findPrecedingUserLabel(messages, messageId);
      setRollbackInfo({ messageId, label });
    },
    [activeId, onSetFiles, messages, flushSnapshotUpdate],
  );

  const handleSlashCommand = useCallback(
    (cmd: string) => {
      setInput("");
      switch (cmd) {
        case "new":
          useConversationStore.getState().createConversation();
          break;
        case "fork":
          useConversationStore.getState().forkConversation();
          break;
        case "clear":
          useConversationStore.getState().setMessages([]);
          break;
        case "compact":
          onCompressContext();
          break;
        case "review":
          onReview();
          break;
        case "retry":
          onRetry();
          break;
      }
    },
    [onCompressContext, onReview, onRetry],
  );

  // Find the last assistant message index for the generating indicator
  let lastAssistantIdx = -1;
  for (let i = mergedMessages.length - 1; i >= 0; i--) {
    if (mergedMessages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || isGenerating) return;
    if (!hasValidSettings) {
      onOpenSettings();
      return;
    }
    const prompt = input.trim();
    const imgs = [...images];
    setInput("");
    setImages([]);

    // Flush manual edits into the latest snapshot before generating
    flushSnapshotUpdate();

    // If we have a pending rollback, truncate messages to the rollback point first
    if (rollbackInfo) {
      const endIdx = findAssistantGroupEnd(messages, rollbackInfo.messageId);
      useConversationStore.getState().setMessages(messages.slice(0, endIdx));
      setRollbackInfo(null);
    }

    await onGenerate(prompt, imgs.length > 0 ? imgs : undefined);
  };

  return (
    <div className="flex flex-col h-screen bg-background border-r">
      <ChatHeader
        isGenerating={isGenerating}
        onOpenSettings={onOpenSettings}
        onToggleSessionList={() => setShowSessionList((v) => !v)}
      />

      {showSessionList ? (
        <SessionList onClose={() => setShowSessionList(false)} />
      ) : (
        <>
          <div
            className="flex flex-col flex-1 p-4 pb-0 overflow-y-auto space-y-4"
            style={{ scrollbarGutter: "stable" }}
          >
            {!hasValidSettings && (
              <SettingsWarning onOpenSettings={onOpenSettings} />
            )}

            {messages.length === 0 && hasValidSettings && (
              <EmptyState onSelectSuggestion={setInput} />
            )}

            {mergedMessages.map((msg, mi) => {
              const idx = parseInt(msg.id.split("-").pop()!, 10);
              // Show divider before the first merged message at or after the compression point
              const showDivider =
                compressFromIndex >= 0 &&
                idx >= compressFromIndex &&
                (mi === 0 ||
                  parseInt(mergedMessages[mi - 2].id.split("-").pop()!, 10) <
                    compressFromIndex);
              return (
                <div key={msg.id}>
                  <MessageBubble
                    message={msg}
                    isGenerating={isGenerating}
                    snapshotExists={snapshotMessageIds.has(msg.id)}
                    onShowDiff={(id) => setDiffMessageId(id)}
                    onRollback={(id) => setRollbackConfirmId(id)}
                    onRetry={onRetry}
                  />
                  {showDivider && (
                    <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
                      <div className="flex-1 border-t" />
                      <span>{t.compress.divider}</span>
                      <div className="flex-1 border-t" />
                    </div>
                  )}
                </div>
              );
            })}

            {isMobile && isProjectInitialized && !isGenerating && (
              <MobilePreview
                files={files}
                template={template}
                sandpackKey={sandpackKey}
              />
            )}

            {isGenerating && <GeneratingIndicator />}

            {/* Rollback hint */}
            {rollbackInfo && !isGenerating && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                <Undo2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {t.rollback.rolledBackTo}
                  <span className="font-medium">
                    {rollbackInfo.label || t.rollback.initialState}
                  </span>
                </span>
                <button
                  onClick={() => setRollbackInfo(null)}
                  className="ml-auto text-amber-600/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Context compression hint */}
            {!isGenerating &&
              messages.length > 0 &&
              typeof messages[messages.length - 1].content === "string" &&
              (messages[messages.length - 1].content as string).includes(
                "context_length_exceeded",
              ) && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-700 dark:text-orange-400">
                  <span>{t.compress.hint}</span>
                  <button
                    onClick={() => onCompressContext()}
                    className="ml-auto shrink-0 px-2 py-1 rounded bg-orange-500 text-white text-xs hover:bg-orange-600 transition-colors cursor-pointer"
                  >
                    {t.compress.button}
                  </button>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            input={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            onStop={onStop}
            isGenerating={isGenerating}
            images={images}
            onImagesChange={setImages}
            onSlashCommand={handleSlashCommand}
          />
        </>
      )}

      {/* Diff modal */}
      {diffMessageId && activeId && (
        <DiffModal
          conversationId={activeId}
          messageId={diffMessageId}
          onClose={() => setDiffMessageId(null)}
        />
      )}

      {/* Rollback confirmation */}
      {rollbackConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border p-6 shadow-lg max-w-sm mx-4">
            <h3 className="text-sm font-semibold mb-2">{t.rollback.confirm}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.rollback.confirmDesc}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRollbackConfirmId(null)}
                className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors cursor-pointer"
              >
                {t.rollback.cancel}
              </button>
              <button
                onClick={() => handleRollback(rollbackConfirmId)}
                className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {t.rollback.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
