// ============================================================================
//  ai-tools.ts
//  Zod-based 工具定义 —— 使用 AI SDK tool() + Zod schema 定义所有内置工具
// ============================================================================

import { tool } from "ai";
import { z } from "zod";

/**
 * 内置工具定义（Zod 格式）
 * 这些工具的执行逻辑仍在 generator.ts 的 executeTool 中，
 * 这里只定义 schema，不提供 execute 回调。
 */
export const BUILTIN_TOOLS = {
  init_project: tool({
    description:
      "Initialize the project with a Sandpack template. Call this FIRST when starting a new project. " +
      "Available templates: " +
      "static (plain HTML/CSS/JS), " +
      "vanilla (vanilla JS with bundler), " +
      "vanilla-ts (vanilla TypeScript), " +
      "react (React with JavaScript), " +
      "react-ts (React with TypeScript, DEFAULT), " +
      "vue (Vue 3 with JavaScript), " +
      "vue-ts (Vue 3 with TypeScript), " +
      "svelte (Svelte with JavaScript), " +
      "angular (Angular with TypeScript), " +
      "solid (SolidJS with TypeScript), " +
      "vite (Vite vanilla), " +
      "vite-react (Vite + React JS), " +
      "vite-react-ts (Vite + React TypeScript), " +
      "vite-vue (Vite + Vue JS), " +
      "vite-vue-ts (Vite + Vue TypeScript), " +
      "vite-svelte (Vite + Svelte JS), " +
      "vite-svelte-ts (Vite + Svelte TypeScript), " +
      "astro (Astro), " +
      "test-ts (TypeScript test runner).",
    inputSchema: z.object({
      template: z.string().describe("Template name from the available list"),
    }),
  }),

  manage_dependencies: tool({
    description:
      "Add, remove, or update project dependencies by modifying package.json. " +
      "This triggers a full project restart to install the new dependencies. " +
      "Provide the complete updated package.json content.",
    inputSchema: z.object({
      package_json: z
        .string()
        .describe("The complete package.json content to write"),
    }),
  }),

  list_files: tool({
    description:
      "List all file paths currently in the project. Returns one path per line, or '(empty)' if no files exist.",
    inputSchema: z.object({}),
  }),

  read_files: tool({
    description:
      "Read and return the full content of multiple files at once. Always prefer this over calling read_file multiple times.",
    inputSchema: z.object({
      paths: z
        .array(z.string())
        .describe("List of file paths relative to project root"),
    }),
  }),

  write_file: tool({
    description:
      "Create a new file or completely overwrite an existing file with the provided content.",
    inputSchema: z.object({
      path: z.string().describe("File path relative to project root"),
      content: z.string().describe("The complete file content to write"),
    }),
  }),

  patch_file: tool({
    description:
      "Apply one or more search-and-replace patches to an existing file. " +
      "Each patch replaces the FIRST occurrence of the search string. " +
      "Include enough surrounding context in 'search' to ensure uniqueness.",
    inputSchema: z.object({
      path: z.string().describe("File path to patch"),
      patches: z
        .array(
          z.object({
            search: z
              .string()
              .describe("Exact text to find (must be unique in the file)"),
            replace: z.string().describe("Text to replace the match with"),
          }),
        )
        .describe("Ordered list of search-and-replace operations"),
    }),
  }),

  search_in_files: tool({
    description: "Search for a regex pattern across all project files",
    inputSchema: z.object({
      pattern: z.string().describe("Regex pattern"),
    }),
  }),

  delete_file: tool({
    description: "Delete a file from the project.",
    inputSchema: z.object({
      path: z.string().describe("File path to delete"),
    }),
  }),

  get_console_logs: tool({
    description:
      "Get the browser console output from the running Sandpack preview. " +
      "Use this after finishing code changes to check for runtime errors, warnings, or syntax errors. " +
      "If errors are found, fix them immediately.",
    inputSchema: z.object({}),
  }),

  compact_context: tool({
    description:
      "Compress the conversation context to reduce token usage. " +
      "Call this when the conversation is getting long and you sense the context may be approaching limits, " +
      "or when earlier messages contain verbose content no longer needed in full detail. " +
      "This summarizes older messages while preserving key information.",
    inputSchema: z.object({}),
  }),
};
