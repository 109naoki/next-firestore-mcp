"use client";

import { useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, isLoading }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const text = textareaRef.current?.value.trim();
    if (!text || isLoading) return;
    onSend(text);
    if (textareaRef.current) textareaRef.current.value = "";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-2 sm:p-4">
      <div className="max-w-3xl mx-auto flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          className="resize-none min-h-[44px] sm:min-h-[52px] max-h-[200px] text-sm"
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-shrink-0"
          size="sm"
        >
          Send
        </Button>
      </div>
    </div>
  );
};
