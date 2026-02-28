import { PanelLeft, Settings, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversationStore } from "../../store/conversation";
import { useT } from "../../i18n";

interface ChatHeaderProps {
  isGenerating: boolean;
  onOpenSettings: () => void;
  onToggleSessionList: () => void;
}

export function ChatHeader({
  onOpenSettings,
  onToggleSessionList,
}: ChatHeaderProps) {
  const t = useT();
  const title = useConversationStore((s) =>
    s.activeId ? (s.conversations[s.activeId]?.title ?? t.chat.newApp) : t.chat.newApp,
  );

  return (
    <div className="h-14 px-3 border-b bg-background flex items-center justify-between shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSessionList}
        title={t.header.sessions}
        className="h-8 w-8 shrink-0"
      >
        <PanelLeft size={18} />
      </Button>
      <span className="text-sm font-medium truncate px-2 flex-1 text-center">
        {title}
      </span>
      <div>
        <a href="https://github.com/Amery2010/open-builder" target="_blank">
          <Button
            variant="ghost"
            size="icon"
            title={t.header.openSource}
            className="h-8 w-8 shrink-0"
          >
            <Github size={18} />
          </Button>
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          title={t.header.settings}
          className="h-8 w-8 shrink-0"
        >
          <Settings size={18} />
        </Button>
      </div>
    </div>
  );
}
