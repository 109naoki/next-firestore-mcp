import type { Timestamp } from "firebase-admin/firestore";

export interface Thread {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessagePreview: string;
  model: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  parts?: unknown[];
  attachedFileNames?: string[];
  createdAt: Timestamp;
}

// Serialized versions for client-side use
export interface ThreadSerialized {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  model: string;
}

export interface ChatMessageSerialized {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  parts?: unknown[];
  attachedFileNames?: string[];
  createdAt: string;
}
