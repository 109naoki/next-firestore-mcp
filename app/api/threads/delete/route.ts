import { type NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { deleteThread } from "@/lib/threads";
import { verifyToken } from "@/lib/verify-token";

export const POST = async (request: NextRequest) => {
  // 認証チェック
  const tokenData = await verifyToken(request);
  if (!tokenData) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { threadId } = await request.json();

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // スレッド所有権確認
    const db = getAdminFirestore();
    const threadSnap = await db.collection("threads").doc(threadId).get();

    if (!threadSnap.exists || threadSnap.data()?.userId !== tokenData.uid) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await deleteThread(threadId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete thread:", error);
    return new Response(JSON.stringify({ error: "Failed to delete thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
