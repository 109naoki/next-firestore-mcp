import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";

/**
 * Firebase Auth の認証状態を管理し、
 * 最新の ID トークンを Authorization ヘッダーに自動付与するフェッチ関数を提供
 */
export const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);

      if (!firebaseUser) {
        router.push("/login");
      } else if (!firebaseUser.emailVerified) {
        router.push("/verify-email");
      }
    });

    return unsubscribe;
  }, [router]);

  const logout = useCallback(async () => {
    const auth = getClientAuth();
    await signOut(auth);
    router.push("/login");
  }, [router]);

  /**
   * 最新の ID トークンを取得して Authorization ヘッダーに含めたフェッチ
   */
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const auth = getClientAuth();
      const currentUser = auth.currentUser ?? user;

      if (!currentUser) {
        // 認証されていない場合は 401 相当のレスポンスを返す
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Firebase SDK が自動で期限切れトークンをリフレッシュしてくれる
      const idToken = await currentUser.getIdToken();

      const headers = new Headers(options.headers as HeadersInit | undefined);
      headers.set("Authorization", `Bearer ${idToken}`);

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        await logout();
      }

      return response;
    },
    [user, logout]
  );

  /**
   * 現在の最新 ID トークンを取得
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  return {
    user,
    isLoading,
    logout,
    authFetch,
    getToken,
    isAuthenticated: !!user,
  };
};
