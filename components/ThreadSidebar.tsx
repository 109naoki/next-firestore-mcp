"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useThreads } from "@/hooks/use-threads";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreadSidebarProps {
  onNavigate?: () => void;
}

export const ThreadSidebar = ({ onNavigate }: ThreadSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, authFetch } = useAuth();
  const { data: threads, isLoading } = useThreads();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    setIsCreating(true);
    try {
      const res = await authFetch("/api/threads/create", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create thread");
      const { threadId } = await res.json();
      router.push(`/chat/${threadId}`);
      onNavigate?.();
    } catch (error) {
      console.error("Failed to create thread:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-64 h-full flex flex-col border-r bg-muted/30">
      {/* New chat button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          disabled={isCreating}
          className="w-full"
          size="sm"
        >
          {isCreating ? "作成中..." : "+ 新規チャット"}
        </Button>
      </div>

      <Separator />

      {/* Thread list */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !threads || threads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              会話はまだありません
            </p>
          ) : (
            threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={pathname === `/chat/${thread.id}`}
                onNavigate={onNavigate}
              />
            ))
          )}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Logout */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={logout}
        >
          サインアウト
        </Button>
      </div>
    </aside>
  );
};

const ThreadItem = ({
  thread,
  isActive,
  onNavigate,
}: {
  thread: { id: string; title: string; lastMessagePreview: string };
  isActive: boolean;
  onNavigate?: () => void;
}) => {
  return (
    <Link
      href={`/chat/${thread.id}`}
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        "block rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors",
        isActive && "bg-muted font-medium",
      )}
    >
      <p className="truncate">{thread.title}</p>
      {thread.lastMessagePreview && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {thread.lastMessagePreview}
        </p>
      )}
    </Link>
  );
};
