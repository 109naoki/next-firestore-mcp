"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ChatInterface } from "@/components/ChatInterface";
import { Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ threadId: string }>;
}

interface ThreadData {
  id: string;
  title: string;
  model: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    attachedFileNames?: string[];
  }>;
}

const ThreadPage = ({ params }: Props) => {
  const { authFetch, isLoading: authLoading } = useAuth();
  const [threadId, setThreadId] = useState<string>("");
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setThreadId(p.threadId);
    });
  }, [params]);

  useEffect(() => {
    if (!threadId || authLoading) return;

    const fetchThreadData = async () => {
      try {
        setIsLoading(true);
        const res = await authFetch(`/api/threads/${threadId}`);

        if (!res.ok) {
          setError(res.status === 404 ? "スレッドが見つかりません" : "スレッドの読み込みに失敗しました");
          return;
        }

        const data = await res.json();
        setThreadData(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch thread:", err);
        setError("スレッドの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreadData();
  }, [threadId, authLoading, authFetch]);

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-destructive text-center">
          <p className="text-lg font-semibold mb-2">エラー</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!threadData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">スレッドデータがありません</div>
      </div>
    );
  }

  return (
    <ChatInterface
      key={threadId}
      threadId={threadId}
      initialMessages={threadData.messages}
      threadTitle={threadData.title}
      model={threadData.model}
    />
  );
};

export default ThreadPage;
