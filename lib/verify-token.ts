import "server-only";
import { type NextRequest } from "next/server";
import { getAdminAuth } from "./firebase-admin";

export const verifyToken = async (
  request: NextRequest,
): Promise<{ uid: string; email?: string } | null> => {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);

    if (!decodedToken.email_verified) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};
