import { type NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getThreadMessages } from "@/lib/threads";
import { verifyToken } from "@/lib/verify-token";

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  const tokenData = await verifyToken(request);
  if (!tokenData) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { threadId } = await params;
  const db = getAdminFirestore();
  const threadRef = db.collection("threads").doc(threadId);
  const threadSnap = await threadRef.get();

  if (!threadSnap.exists || threadSnap.data()?.userId !== tokenData.uid) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { model } = body as { model?: string };

  if (!model) {
    return new Response(JSON.stringify({ error: "Missing model" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await threadRef.update({ model });

  return Response.json({ ok: true });
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  // 認証チェック
  const tokenData = await verifyToken(request);
  if (!tokenData) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { threadId } = await params;
  const db = getAdminFirestore();
  const threadSnap = await db.collection("threads").doc(threadId).get();

  // スレッド存在確認 & 所有権確認
  if (!threadSnap.exists || threadSnap.data()?.userId !== tokenData.uid) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const threadData = threadSnap.data()!;
  const messages = await getThreadMessages(threadId);

  const serialized = {
    id: threadId,
    title: threadData.title,
    model: threadData.model || "claude-sonnet-4-5",
    messages: messages.map((msg) => {
      const data: Record<string, unknown> = {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };
      if (msg.attachedFileNames && msg.attachedFileNames.length > 0) {
        data.attachedFileNames = msg.attachedFileNames;
      }
      return data;
    }),
  };

  return Response.json(serialized);
};
