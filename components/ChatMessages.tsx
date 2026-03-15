"use client";

import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";

interface Props {
  messages: UIMessage[];
  isLoading: boolean;
}

export const ChatMessages = ({ messages, isLoading }: Props) => {
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
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && <ThinkingIndicator />}
    </div>
  );
};

const MessageBubble = ({ message }: { message: UIMessage }) => {
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
        {message.parts.map((part, i) => (
          <MessagePartView key={i} part={part} />
        ))}
      </div>
    </div>
  );
};

const MessagePartView = ({
  part,
}: {
  part: UIMessage["parts"][number];
}): ReactNode => {
  if (part.type === "text") {
    return <p className="whitespace-pre-wrap break-words">{part.text}</p>;
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
      <div className="mt-2 p-2 rounded-md bg-background/50 border border-border/50 text-xs">
        <div className="flex items-center gap-2 font-medium text-muted-foreground">
          <span className="truncate">Tool: {toolName}</span>
          <span
            className={cn(
              "flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px]",
              isDone
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            )}
          >
            {isDone ? "done" : "calling..."}
          </span>
        </div>
        {isDone && toolPart.output != null && (
          <pre className="mt-1 text-[10px] overflow-x-auto text-muted-foreground">
            {JSON.stringify(toolPart.output, null, 2).slice(0, 500)}
          </pre>
        )}
      </div>
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
