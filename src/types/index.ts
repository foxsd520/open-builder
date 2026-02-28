import type { Message as _Message, ProjectFiles as _ProjectFiles } from "../lib/generator";

export type {
  ProjectFiles,
  ContentPart,
  Message,
  ToolCall,
  ToolDefinition,
  FileChange,
  GenerateResult,
  GeneratorOptions,
  GeneratorEvents,
} from "../lib/generator";

export type { AISettings, WebSearchSettings } from "../store/settings";
export type { OpenAIClientConfig } from "../lib/client";

// ─── Chat UI types ────────────────────────────────────────────────────────────

export interface TextBlock {
  type: "text";
  content: string;
  id: string;
}

export interface ImageBlock {
  type: "image";
  url: string;
  id: string;
}

export interface ThinkingBlock {
  type: "thinking";
  content: string;
  id: string;
}

export interface ToolBlock {
  type: "tool";
  toolName: string;
  title: string;
  path: string;
  paths?: string[];
  result: string;
  id: string;
}

export type Block = TextBlock | ImageBlock | ThinkingBlock | ToolBlock;

export interface MergedMessage {
  role: "user" | "assistant";
  blocks: Block[];
  id: string;
}

// ─── Snapshot types ─────────────────────────────────────────────────────────

/** Incremental project snapshot (git-like) */
export interface ProjectSnapshot {
  id: string;
  /** The conversation this snapshot belongs to */
  conversationId: string;
  /** Associated MergedMessage ID (e.g. "assistant-0") */
  messageId: string;
  /** File path → unified diff patch (modified files only) */
  patches: Record<string, string>;
  /** Newly added files: path → full content */
  addedFiles: Record<string, string>;
  /** Paths of deleted files */
  deletedFiles: string[];
  createdAt: number;
}

// ─── Conversation types ──────────────────────────────────────────────────────

/** Compressed context: summary text + the message index where compression starts */
export interface CompressedContext {
  summary: string;
  fromIndex: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: _Message[];
  files: _ProjectFiles;
  template: string;
  isProjectInitialized: boolean;
  compressedContext?: CompressedContext;
  createdAt: number;
  updatedAt: number;
}
