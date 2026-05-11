"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args: Record<string, any>;
  result?: any;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function getToolLabel(
  toolName: string,
  args: Record<string, any>
): string {
  if (!args || typeof args !== "object") return "Working...";

  if (toolName === "str_replace_editor") {
    const filename = args.path ? basename(args.path) : null;
    if (!filename) return "Editing file";
    switch (args.command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename}`;
      case "view":
        return `Reading ${filename}`;
      case "undo_edit":
        return `Reverting ${filename}`;
      default:
        return `Editing ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    const filename = args.path ? basename(args.path) : null;
    if (!filename) return "Managing files";
    switch (args.command) {
      case "rename": {
        const newName = args.new_path ? basename(args.new_path) : null;
        return newName ? `Renaming ${filename} → ${newName}` : `Renaming ${filename}`;
      }
      case "delete":
        return `Deleting ${filename}`;
      default:
        return `Managing ${filename}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, state, args } = toolInvocation;
  const label = getToolLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
