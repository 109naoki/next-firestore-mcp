import { type NextRequest } from "next/server";
import { getUserThreads } from "@/lib/threads";
import { verifyToken } from "@/lib/verify-token";

export const GET = async (request: NextRequest) => {
  const tokenData = await verifyToken(request);

  if (!tokenData) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const threads = await getUserThreads(tokenData.uid);

  // Serialize Firestore Timestamps to ISO strings
  const serialized = threads.map((thread) => ({
    ...thread,
    createdAt: thread.createdAt?.toDate?.()?.toISOString() ?? "",
    updatedAt: thread.updatedAt?.toDate?.()?.toISOString() ?? "",
  }));

  return Response.json(serialized);
};
