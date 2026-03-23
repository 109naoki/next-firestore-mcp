"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getClientAuth } from "@/lib/firebase-client";
import { ChatMessages } from "./ChatMessages";
import { ChatInput, type ParsedFile } from "./ChatInput";
import { ModelSelector, type ModelId } from "./ModelSelector";
import { useInvalidateThreads } from "@/hooks/use-threads";
import { Loader2 } from "lucide-react";

interface InitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachedFileNames?: string[];
}

interface Props {
  threadId: string;
  initialMessages: InitialMessage[];
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
  const pendingFileNamesRef = useRef<string[]>([]);

  // Track attachedFileNames per message ID (from DB + newly sent)
  const [fileNamesMap, setFileNamesMap] = useState<Record<string, string[]>>(
    () => {
      const map: Record<string, string[]> = {};
      for (const msg of initialMessages) {
        if (msg.attachedFileNames && msg.attachedFileNames.length > 0) {
          map[msg.id] = msg.attachedFileNames;
        }
      }
      return map;
    },
  );

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
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId, model: selectedModel },
        fetch: async (url, init) => {
          const headers = new Headers(init?.headers);
          const user = getClientAuth().currentUser;
          if (user) {
            headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
          }
          // Inject pending file names into the request body
          const fileNames = pendingFileNamesRef.current;
          if (fileNames.length > 0 && init?.body) {
            const body = JSON.parse(init.body as string);
            body.attachedFileNames = fileNames;
            pendingFileNamesRef.current = [];
            return globalThis.fetch(url, {
              ...init,
              headers,
              body: JSON.stringify(body),
            });
          }
          return globalThis.fetch(url, { ...init, headers });
        },
      }),
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

  // Associate pending file names with newly added user messages
  const prevMessageCountRef = useRef(initialMessages.length);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const pending = pendingFileNamesRef.current;
      if (pending.length > 0) {
        // Find the new user message
        const newUserMsg = messages
          .slice(prevMessageCountRef.current)
          .find((m) => m.role === "user");
        if (newUserMsg) {
          setFileNamesMap((prev) => ({ ...prev, [newUserMsg.id]: pending }));
          pendingFileNamesRef.current = [];
        }
      }
    }
    prevMessageCountRef.current = messages.length;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

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
        throw new Error(data.error || "ファイルの解析に失敗しました");
      }
      return res.json();
    },
    [authFetch],
  );

  const handleSend = (text: string, files: ParsedFile[]) => {
    pendingFileNamesRef.current = files.map((f) => f.name);

    // Compose message with file contents for AI, but user only sees their text
    let aiText = "";
    if (files.length > 0) {
      aiText += "<attached-files>\n";
      for (const f of files) {
        aiText += `<file name="${f.name}">\n${f.content}\n</file>\n`;
      }
      aiText += "</attached-files>\n\n";
    }
    aiText += text;

    sendMessage({ text: aiText });
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
        <ChatMessages messages={messages} isLoading={isLoading} fileNamesMap={fileNamesMap} />
        <div ref={bottomRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          エラー: {error.message}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        parseFile={handleParseFile}
        isLoading={isLoading}
        modelSelector={
          <div className="md:hidden">
            <ModelSelector value={selectedModel} onChange={handleModelChange} />
          </div>
        }
      />
    </div>
  );
};
