"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useThreads } from "@/hooks/use-threads";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const ChatPage = () => {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, authFetch } = useAuth();
  const { data: threads, isLoading: threadsLoading } = useThreads();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateThread = async () => {
    setIsCreating(true);
    try {
      const res = await authFetch("/api/threads/create", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create thread");
      const { threadId } = await res.json();
      router.push(`/chat/${threadId}`);
    } catch (error) {
      console.error("Failed to create thread:", error);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!threadsLoading && threads && threads.length > 0) {
      router.push(`/chat/${threads[0].id}`);
    }
  }, [authLoading, isAuthenticated, threadsLoading, threads, router]);

  if (authLoading || threadsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          No conversations yet
        </h2>
        <Button onClick={handleCreateThread} disabled={isCreating}>
          {isCreating ? "Creating..." : "Start a new chat"}
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;
