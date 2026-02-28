import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";
import { useTheme } from "../../hooks/useTheme";
import type { ProjectFiles } from "../../types";

interface MobilePreviewProps {
  files: ProjectFiles;
  template: string;
  sandpackKey: number;
}

export function MobilePreview({
  files,
  template,
  sandpackKey,
}: MobilePreviewProps) {
  const isDark = useTheme();
  const sandpackFiles = Object.fromEntries(
    Object.entries(files).map(([path, content]) => [
      path.startsWith("/") ? path : `/${path}`,
      { code: content },
    ]),
  );

  return (
    <div className="editor border rounded-lg min-h-160 overflow-hidden bg-background">
      <SandpackProvider
        key={sandpackKey}
        template={template as SandpackPredefinedTemplate}
        theme={isDark ? "dark" : "light"}
        files={sandpackFiles}
      >
        <SandpackPreview
          showNavigator
          showOpenInCodeSandbox={false}
          showRefreshButton
          style={{ height: 640 }}
        />
      </SandpackProvider>
    </div>
  );
}
