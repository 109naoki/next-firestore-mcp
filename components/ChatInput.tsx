"use client";

import {
  useRef,
  useEffect,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Mic, MicOff, Paperclip, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILES = 3;

export interface ParsedFile {
  name: string;
  content: string;
}

interface AttachedFile {
  id: string;
  filename: string;
  status: "parsing" | "parsed" | "error";
  content?: string;
  error?: string;
}

interface Props {
  onSend: (text: string, files: ParsedFile[]) => void;
  parseFile: (file: File) => Promise<{ text: string; truncated: boolean }>;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, parseFile, isLoading }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const { isSupported, isListening, transcript, start, stop } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript && textareaRef.current) {
      const current = textareaRef.current.value;
      const separator = current && !current.endsWith(" ") ? " " : "";
      textareaRef.current.value = current + separator + transcript;
    }
  }, [transcript]);

  const isParsing = attachedFiles.some((f) => f.status === "parsing");

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      if (file.size > 10 * 1024 * 1024) {
        const id = crypto.randomUUID();
        setAttachedFiles((prev) => [
          ...prev,
          { id, filename: file.name, status: "error", error: "10MB超" },
        ]);
        continue;
      }

      const id = crypto.randomUUID();
      setAttachedFiles((prev) => [
        ...prev,
        { id, filename: file.name, status: "parsing" },
      ]);

      parseFile(file)
        .then((data) => {
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, status: "parsed" as const, content: data.text }
                : f,
            ),
          );
        })
        .catch((err) => {
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: "error" as const,
                    error: err instanceof Error ? err.message : "解析に失敗しました",
                  }
                : f,
            ),
          );
        });
    }

    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = () => {
    const text = textareaRef.current?.value.trim();
    const parsedFiles = attachedFiles.filter((f) => f.status === "parsed");

    if ((!text && parsedFiles.length === 0) || isLoading || isParsing) return;
    if (isListening) stop();

    const files: ParsedFile[] = parsedFiles.map((f) => ({
      name: f.filename,
      content: f.content!,
    }));
    onSend(text || "", files);
    setAttachedFiles([]);
    if (textareaRef.current) textareaRef.current.value = "";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-2 sm:p-4">
      <div className="max-w-3xl mx-auto">
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((f) => (
              <div
                key={f.id}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border",
                  f.status === "error"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : f.status === "parsing"
                      ? "border-muted bg-muted/50 text-muted-foreground"
                      : "border-border bg-muted/30 text-foreground",
                )}
              >
                {f.status === "parsing" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FileText className="size-3" />
                )}
                <span className="max-w-[150px] truncate">{f.filename}</span>
                {f.status === "error" && (
                  <span className="text-[10px]">{f.error}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attachedFiles.length >= MAX_FILES}
            className="flex-shrink-0"
            aria-label="ファイルを添付"
          >
            <Paperclip className="size-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.pdf,.pptx,.txt,.csv,.json,.md,.xml,.html,.ts,.tsx,.js,.jsx,.py,.yaml,.yml"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Textarea
            ref={textareaRef}
            placeholder="メッセージを入力... (Ctrl+Enterで送信)"
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
              aria-label={isListening ? "録音を停止" : "音声入力を開始"}
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
            disabled={isLoading || isParsing}
            className="flex-shrink-0"
            size="sm"
          >
            送信
          </Button>
        </div>
      </div>
    </div>
  );
};
