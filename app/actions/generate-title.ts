"use server";

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const generateThreadTitle = async (
  threadId: string,
  firstUserMessage: string,
): Promise<void> => {
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      prompt: `Generate a concise, descriptive title (max 6 words, no quotes) for a conversation that starts with:
"${firstUserMessage.slice(0, 200)}"`,
    });

    const db = getAdminFirestore();
    await db.collection("threads").doc(threadId).update({
      title: text.trim(),
    });
  } catch (error) {
    console.error("Failed to generate title:", error);
  }
};
