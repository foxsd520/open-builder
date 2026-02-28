import { useMemo, useState } from "react";
import { diffLines, type Change } from "diff";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSnapshotStore } from "../../store/snapshot";
import { cn } from "@/lib/utils";
import { useT } from "../../i18n";

interface DiffModalProps {
  conversationId: string;
  messageId: string;
  onClose: () => void;
}

interface ChangedFile {
  path: string;
  type: "A" | "M" | "D";
}

export function DiffModal({ conversationId, messageId, onClose }: DiffModalProps) {
  const t = useT();
  const snapshots = useSnapshotStore((s) => s.snapshots[conversationId] ?? []);
  const snapshot = snapshots.find((s) => s.messageId === messageId);
  const snapshotIndex = snapshots.findIndex((s) => s.messageId === messageId);

  const changedFiles = useMemo<ChangedFile[]>(() => {
    if (!snapshot) return [];
    const files: ChangedFile[] = [];
    for (const path of Object.keys(snapshot.addedFiles)) {
      files.push({ path, type: "A" });
    }
    for (const path of Object.keys(snapshot.patches)) {
      files.push({ path, type: "M" });
    }
    for (const path of snapshot.deletedFiles) {
      files.push({ path, type: "D" });
    }
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }, [snapshot]);

  const [selectedFile, setSelectedFile] = useState(changedFiles[0]?.path ?? "");

  // Compute diff for the selected file
  const diffChanges = useMemo<Change[]>(() => {
    if (!snapshot || !selectedFile) return [];
    const reconstructFiles = useSnapshotStore.getState().reconstructFiles;

    const prevFiles =
      snapshotIndex > 0
        ? reconstructFiles(conversationId, snapshots[snapshotIndex - 1].id)
        : {};

    const currFiles = reconstructFiles(conversationId, snapshot.id);

    const oldContent = prevFiles[selectedFile] ?? "";
    const newContent = currFiles[selectedFile] ?? "";
    return diffLines(oldContent, newContent);
  }, [snapshot, selectedFile, snapshotIndex, conversationId, snapshots]);

  if (!snapshot) return null;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle>{t.diff.title}</DialogTitle>
        </DialogHeader>

        {/* Mobile: top file bar + vertical diff */}
        {/* Desktop: left sidebar + right diff */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* File list: horizontal scroll on mobile, vertical sidebar on desktop */}
          <div
            className={cn(
              "shrink-0 border-b sm:border-b-0 sm:border-r border-border/50",
              "flex sm:flex-col gap-1 px-3 pb-2 sm:pb-3 sm:pt-0 sm:w-48 overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto",
            )}
          >
            {changedFiles.map((f) => (
              <button
                key={f.path}
                onClick={() => setSelectedFile(f.path)}
                className={cn(
                  "text-xs whitespace-nowrap sm:whitespace-normal text-left px-2 py-1.5 rounded cursor-pointer shrink-0 sm:truncate",
                  selectedFile === f.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "inline-block w-4 font-mono font-bold mr-1",
                    f.type === "A" && "text-green-600",
                    f.type === "M" && "text-yellow-600",
                    f.type === "D" && "text-red-600",
                  )}
                >
                  {f.type}
                </span>
                {f.path}
              </button>
            ))}
          </div>
          {/* Diff view */}
          <div className="flex-1 overflow-auto bg-muted/20">
            {diffChanges.length > 0 ? (
              <DiffView changes={diffChanges} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {t.diff.selectFile}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiffView({ changes }: { changes: Change[] }) {
  const lines: { key: string; className: string; prefix: string; text: string; lineNo: string }[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const rawLines = change.value.split("\n");
    if (rawLines[rawLines.length - 1] === "") rawLines.pop();

    for (let j = 0; j < rawLines.length; j++) {
      const key = `${i}-${j}`;
      if (change.added) {
        lines.push({
          key,
          className: "bg-green-500/10 text-green-700 dark:text-green-400",
          prefix: "+",
          text: rawLines[j],
          lineNo: String(newLine++),
        });
      } else if (change.removed) {
        lines.push({
          key,
          className: "bg-red-500/10 text-red-700 dark:text-red-400",
          prefix: "-",
          text: rawLines[j],
          lineNo: String(oldLine++),
        });
      } else {
        lines.push({
          key,
          className: "",
          prefix: " ",
          text: rawLines[j],
          lineNo: String(newLine),
        });
        oldLine++;
        newLine++;
      }
    }
  }

  return (
    <pre className="text-xs font-mono leading-5 p-2">
      {lines.map((l) => (
        <div key={l.key} className={l.className}>
          <span className="inline-block w-10 text-right pr-3 text-muted-foreground/60 select-none">
            {l.lineNo}
          </span>
          <span className="select-none">{l.prefix} </span>
          {l.text}
        </div>
      ))}
    </pre>
  );
}
