"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationData {
  toolName: string;
  args?: Record<string, any>;
  state?: string;
  result?: unknown;
}

interface ToolInvocationProps {
  toolInvocation: ToolInvocationData;
}

// Pull just the file/folder name out of a VFS path like "/src/Card.jsx".
function basename(path?: string): string {
  if (!path) return "file";
  const trimmed = path.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

/**
 * Translate a raw tool invocation into a short, human-friendly description of
 * what the assistant is doing to the virtual file system.
 *
 * `completed` controls tense: present-progressive while the tool is running
 * ("Creating Card.jsx") and past tense once it has returned a result
 * ("Created Card.jsx").
 */
export function getToolInvocationLabel(
  toolInvocation: ToolInvocationData,
  completed: boolean
): string {
  const { toolName, args = {} } = toolInvocation;
  const name = basename(args.path);

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return completed ? `Created ${name}` : `Creating ${name}`;
      case "str_replace":
      case "insert":
        return completed ? `Edited ${name}` : `Editing ${name}`;
      case "view":
        return completed ? `Viewed ${name}` : `Viewing ${name}`;
      case "undo_edit":
        return completed ? `Reverted ${name}` : `Reverting ${name}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "rename": {
        const to = basename(args.new_path);
        return completed
          ? `Renamed ${name} to ${to}`
          : `Renaming ${name} to ${to}`;
      }
      case "delete":
        return completed ? `Deleted ${name}` : `Deleting ${name}`;
    }
  }

  // Fallback for any unrecognized tool — still better than a raw id, but keep
  // the original name so nothing is silently swallowed.
  return completed ? `Ran ${toolName}` : `Running ${toolName}`;
}

export function ToolInvocation({ toolInvocation }: ToolInvocationProps) {
  const completed =
    toolInvocation.state === "result" && toolInvocation.result != null;
  const label = getToolInvocationLabel(toolInvocation, completed);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {completed ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" aria-hidden="true" />
      )}
      <span className={cn("text-neutral-700 font-medium")}>{label}</span>
    </div>
  );
}
