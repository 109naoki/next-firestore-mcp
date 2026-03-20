import "server-only";
import { type NextRequest } from "next/server";
import { streamText, stepCountIs, type UIMessage, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createMCPTools } from "@/lib/mcp-clients";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "@/lib/verify-token";

export const maxDuration = 60;

export const POST = async (request: NextRequest) => {
  // 1. Auth check
  const tokenData = await verifyToken(request);

  if (!tokenData) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = tokenData.uid;

  // 2. Parse request body
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uiMessages = raw.messages as UIMessage[];
  const threadId = raw.threadId as string;
  const model = (raw.model as string) || "claude-sonnet-4-5";
  const attachedFileNames = (raw.attachedFileNames as string[]) || [];

  if (!uiMessages || !threadId) {
    return new Response(JSON.stringify({ error: "Missing messages or threadId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Verify thread belongs to this user
  const db = getAdminFirestore();
  const threadRef = db.collection("threads").doc(threadId);
  const threadSnap = await threadRef.get();

  if (!threadSnap.exists || threadSnap.data()?.userId !== userId) {
    return new Response(JSON.stringify({ error: "Thread not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Create MCP tool connections
  const { tools, closeAll } = await createMCPTools();

  // 5. Save user message to Firestore
  const lastMessage = uiMessages[uiMessages.length - 1];
  const userContent = lastMessage?.role === "user"
    ? (lastMessage.parts?.find((p) => p.type === "text") as { type: "text"; text: string } | undefined)?.text ?? ""
    : "";

  if (lastMessage?.role === "user" && userContent) {
    // Strip <attached-files> block from DB content (AI still sees it via modelMessages)
    const cleanContent = userContent
      .replace(/<attached-files>[\s\S]*?<\/attached-files>\s*/g, "")
      .trim();

    const messageData: Record<string, unknown> = {
      role: "user",
      content: cleanContent || userContent,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (attachedFileNames.length > 0) {
      messageData.attachedFileNames = attachedFileNames;
    }
    await threadRef.collection("messages").add(messageData);
  }

  // 6. Convert UIMessages to model messages and stream response
  const modelMessages = await convertToModelMessages(uiMessages);

  const resolveModel = (modelId: string) => {
    if (modelId.startsWith("gpt-") || modelId.startsWith("o3")) {
      return openai(modelId);
    }
    if (modelId.startsWith("gemini-")) {
      return google(modelId);
    }
    return anthropic(modelId);
  };

  const result = streamText({
    model: resolveModel(model),
    system: `You are a helpful AI assistant with access to various tools via MCP.
Use tools when they help you provide better answers.
Always be clear about what tools you used and what you found.
When the user asks about recent events, current information, or topics that require up-to-date data, use the web search tool to find relevant information. Cite sources when providing search-based answers.
When the user's message contains <attached-files> blocks, analyze the file contents provided and reference specific data when answering.`,
    messages: modelMessages,
    tools: tools as Parameters<typeof streamText>[0]["tools"],
    stopWhen: stepCountIs(10),

    onFinish: async ({ text }) => {
      closeAll().catch(console.error);

      try {
        const batch = db.batch();

        // Save assistant response
        const msgRef = threadRef.collection("messages").doc();
        batch.set(msgRef, {
          role: "assistant",
          content: text,
          createdAt: FieldValue.serverTimestamp(),
        });

        // Update thread metadata
        batch.update(threadRef, {
          updatedAt: FieldValue.serverTimestamp(),
          lastMessagePreview: text.slice(0, 100),
          model,
        });

        await batch.commit();

        // Auto-generate title on first message
        if (uiMessages.length === 1 && userContent) {
          const { generateThreadTitle } =
            await import("@/app/actions/generate-title");
          generateThreadTitle(threadId, userContent).catch(
            console.error,
          );
        }
      } catch (error) {
        console.error("Failed to persist messages:", error);
      }
    },
  });

  return result.toUIMessageStreamResponse();
};
