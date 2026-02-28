import { Button } from "@/components/ui/button";
import { useT } from "../../i18n";

interface EmptyStateProps {
  onSelectSuggestion: (text: string) => void;
}

export function EmptyState({ onSelectSuggestion }: EmptyStateProps) {
  const t = useT();
  const suggestions = [
    { icon: "📝", text: t.empty.suggestions.todo },
    { icon: "☁️", text: t.empty.suggestions.weather },
    { icon: "💡", text: t.empty.suggestions.calculator },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
      <img className="w-16 h-16 mb-4" src="/logo.svg" alt="logo" />
      <h3 className="text-base font-semibold mb-2">{t.empty.title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {t.empty.desc}
      </p>
      <div className="space-y-2 w-full max-w-xs">
        {suggestions.map(({ icon, text }) => (
          <Button
            key={text}
            variant="outline"
            className="w-full justify-start h-auto py-2.5 text-left"
            onClick={() => onSelectSuggestion(text)}
          >
            <span className="text-base mr-2">{icon}</span>
            <span className="text-sm">{text}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
