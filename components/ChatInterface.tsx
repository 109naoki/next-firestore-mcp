"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createAuthChatTransport } from "@/lib/auth-chat-transport";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ModelSelector, type ModelId } from "./ModelSelector";
import { useInvalidateThreads } from "@/hooks/use-threads";

interface Props {
  threadId: string;
  initialMessages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>;
  threadTitle: string;
  model: string;
}

export const ChatInterface = ({
  threadId,
  initialMessages,
  threadTitle,
  model,
}: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const invalidateThreads = useInvalidateThreads();
  const { isLoading: authLoading, isAuthenticated, authFetch } = useAuth();
  const [selectedModel, setSelectedModel] = useState(model);

  const handleModelChange = useCallback(
    (newModel: ModelId) => {
      setSelectedModel(newModel);
      authFetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: newModel }),
      }).catch(console.error);
    },
    [threadId, authFetch],
  );

  const transport = useMemo(
    () => createAuthChatTransport({ threadId, model: selectedModel }),
    [threadId, selectedModel],
  );

  const { messages, status, sendMessage, error } = useChat({
    transport,
    messages: initialMessages.map((msg) => ({
      ...msg,
      parts: [{ type: "text" as const, text: msg.content }],
    })),
    onFinish: () => {
      invalidateThreads();
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  const handleParseFile = useCallback(
    async (file: File): Promise<{ text: string; truncated: boolean }> => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await authFetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Parse failed");
      }
      return res.json();
    },
    [authFetch],
  );

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header (デスクトップのみ表示、モバイルは layout のヘッダーを使用) */}
      <div className="hidden md:flex border-b px-4 py-3 items-center gap-3">
        <h1 className="font-semibold truncate">{threadTitle}</h1>
        <div className="ml-auto">
          <ModelSelector value={selectedModel} onChange={handleModelChange} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={messages} isLoading={isLoading} />
        <div ref={bottomRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          Error: {error.message}
        </div>
      )}

      {/* モバイル用モデルセレクター */}
      <div className="md:hidden border-t px-3 pt-2">
        <ModelSelector value={selectedModel} onChange={handleModelChange} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} parseFile={handleParseFile} isLoading={isLoading} />
    </div>
  );
};
