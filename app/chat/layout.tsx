"use client";

import { useState } from "react";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { Button } from "@/components/ui/button";

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* モバイル: オーバーレイ背景 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <ThreadSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* メインエリア */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* モバイルヘッダー */}
        <div className="md:hidden flex items-center border-b px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="mr-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </Button>
          <span className="text-sm font-medium">MCP Chat</span>
        </div>
        {children}
      </main>
    </div>
  );
};

export default ChatLayout;
