import { type NextRequest } from "next/server";
import { createThread } from "@/lib/threads";
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
    const threadId = await createThread(tokenData.uid);
    return Response.json({ threadId });
  } catch (error) {
    console.error("Failed to create thread:", error);
    return new Response(JSON.stringify({ error: "Failed to create thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
