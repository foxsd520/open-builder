import type { Message } from "./generator";
import type { CompressedContext } from "../types";

export interface CompressResult {
  summary: string;
  fromIndex: number;
}

export async function compressContext(
  messages: Message[],
  apiUrl: string,
  apiKey: string,
  model: string,
  existingContext?: CompressedContext,
): Promise<CompressResult | null> {
  // Need at least 2 user messages to compress (keep the last exchange)
  const userIndices = messages.reduce<number[]>((acc, m, i) => {
    if (m.role === "user") acc.push(i);
    return acc;
  }, []);
  if (userIndices.length < 2) return null;

  // Split at the last user message boundary — compress everything before it
  const fromIndex = userIndices[userIndices.length - 1];
  if (fromIndex <= 0) return null;

  // If there's an existing compression, only compress the summary + messages since last compression
  let text: string;
  if (existingContext && existingContext.fromIndex > 0) {
    const newer = messages.slice(existingContext.fromIndex, fromIndex)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
      .join("\n");
    text = `[Previous summary]\n${existingContext.summary}\n\n[Recent conversation]\n${newer}`;
  } else {
    const older = messages.slice(0, fromIndex);
    text = older
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
      .join("\n");
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: "Summarize the following conversation concisely. Focus on: what the user requested, what was built/modified, key decisions, and current project state. Be brief but preserve all information needed to continue." },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Compression failed: ${res.status}`);

  const json = await res.json();
  const summary = json.choices?.[0]?.message?.content || "";

  return { summary, fromIndex };
}
