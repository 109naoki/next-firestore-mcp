"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, isLoading }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isSupported, isListening, transcript, start, stop } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript && textareaRef.current) {
      const current = textareaRef.current.value;
      const separator = current && !current.endsWith(" ") ? " " : "";
      textareaRef.current.value = current + separator + transcript;
    }
  }, [transcript]);

  const handleSubmit = () => {
    const text = textareaRef.current?.value.trim();
    if (!text || isLoading) return;
    if (isListening) stop();
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
        {isSupported && (
          <Button
            type="button"
            variant={isListening ? "destructive" : "ghost"}
            size="icon-sm"
            onClick={isListening ? stop : start}
            disabled={isLoading}
            className={cn("flex-shrink-0", isListening && "animate-pulse")}
            aria-label={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        )}
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
