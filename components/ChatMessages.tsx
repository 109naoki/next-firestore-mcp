"use client";

import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { useState, type ReactNode } from "react";
import { ChevronRight, FileText } from "lucide-react";

interface Props {
  messages: UIMessage[];
  isLoading: boolean;
  fileNamesMap?: Record<string, string[]>;
}

export const ChatMessages = ({ messages, isLoading, fileNamesMap = {} }: Props) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
        <p>Send a message to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 max-w-3xl mx-auto w-full">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          attachedFileNames={fileNamesMap[message.id]}
        />
      ))}
      {isLoading && <ThinkingIndicator />}
    </div>
  );
};

const MessageBubble = ({
  message,
  attachedFileNames,
}: {
  message: UIMessage;
  attachedFileNames?: string[];
}) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2 sm:gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? "U" : "AI"}
      </div>

      <div
        className={cn(
          "flex-1 max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm",
        )}
      >
        {attachedFileNames && attachedFileNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachedFileNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-foreground/20 text-[11px]"
              >
                <FileText className="size-3" />
                {name}
              </span>
            ))}
          </div>
        )}
        {message.parts.map((part, i) => (
          <MessagePartView
            key={i}
            part={part}
            hasFileNamesFromDb={!!attachedFileNames?.length}
          />
        ))}
      </div>
    </div>
  );
};

const MessagePartView = ({
  part,
  hasFileNamesFromDb,
}: {
  part: UIMessage["parts"][number];
  hasFileNamesFromDb?: boolean;
}): ReactNode => {
  if (part.type === "text") {
    // Strip <attached-files> block from display (file contents are for AI only)
    const displayText = part.text
      .replace(/<attached-files>[\s\S]*?<\/attached-files>\s*/g, "")
      .trim();

    // Extract file names from XML for live messages (not yet in DB)
    if (!hasFileNamesFromDb) {
      const fileNames: string[] = [];
      const fileNameRegex = /<file name="([^"]+)">/g;
      let match;
      while ((match = fileNameRegex.exec(part.text)) !== null) {
        fileNames.push(match[1]);
      }

      if (!displayText && fileNames.length === 0) return null;

      return (
        <>
          {fileNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {fileNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-foreground/20 text-[11px]"
                >
                  <FileText className="size-3" />
                  {name}
                </span>
              ))}
            </div>
          )}
          {displayText && (
            <p className="whitespace-pre-wrap break-words">{displayText}</p>
          )}
        </>
      );
    }

    if (!displayText) return null;
    return <p className="whitespace-pre-wrap break-words">{displayText}</p>;
  }

  if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
    const toolPart = part as {
      type: string;
      toolCallId: string;
      toolName?: string;
      state: string;
      input?: unknown;
      output?: unknown;
    };
    const toolName = toolPart.toolName ?? part.type.replace("tool-", "");
    const isDone =
      toolPart.state === "output-available" ||
      toolPart.state === "output-error";

    return (
      <ToolCallView toolName={toolName} isDone={isDone} output={toolPart.output} />
    );
  }

  if (part.type === "reasoning") {
    return (
      <p className="whitespace-pre-wrap text-muted-foreground italic text-xs">
        {part.text}
      </p>
    );
  }

  return null;
};

const ToolCallView = ({
  toolName,
  isDone,
  output,
}: {
  toolName: string;
  isDone: boolean;
  output?: unknown;
}) => {
  const [open, setOpen] = useState(false);
  const hasOutput = isDone && output != null;

  return (
    <div className="mt-1.5 text-xs text-muted-foreground">
      <button
        type="button"
        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        onClick={() => hasOutput && setOpen((v) => !v)}
        disabled={!hasOutput}
      >
        {!isDone ? (
          <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <ChevronRight
            className={cn(
              "size-3 transition-transform",
              open && "rotate-90",
            )}
          />
        )}
        <span className="font-medium">{toolName}</span>
        {!isDone && <span className="opacity-60">running...</span>}
      </button>
      {open && hasOutput && (
        <pre className="mt-1 ml-4.5 p-2 rounded bg-background/50 border border-border/50 text-[10px] overflow-x-auto max-h-[200px] overflow-y-auto">
          {JSON.stringify(output, null, 2).slice(0, 2000)}
        </pre>
      )}
    </div>
  );
};

const ThinkingIndicator = () => {
  return (
    <div className="flex gap-2 sm:gap-3">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
        AI
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
        </div>
      </div>
    </div>
  );
};
