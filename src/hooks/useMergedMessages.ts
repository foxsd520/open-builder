import { useMemo } from "react";
import { mergeMessages } from "../lib/mergeMessages";
import { useSettingsStore } from "../store/settings";
import type { Message, MergedMessage } from "../types";

export function useMergedMessages(messages: Message[]): MergedMessage[] {
  const language = useSettingsStore((s) => s.system.language);
  return useMemo(() => mergeMessages(messages), [messages, language]);
}
