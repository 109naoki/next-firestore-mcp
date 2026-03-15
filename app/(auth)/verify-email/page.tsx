"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, sendEmailVerification, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";

const VerifyEmailPage = () => {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      if (user.emailVerified) {
        router.push("/chat");
        return;
      }
      setEmail(user.email ?? "");
    });
    return unsubscribe;
  }, [router]);

  const handleResend = async () => {
    setSending(true);
    setError("");
    setSent(false);
    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      await sendEmailVerification(user);
      setSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "送信に失敗しました";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    const auth = getClientAuth();
    const user = auth.currentUser;
    if (!user) return;
    await user.reload();
    if (user.emailVerified) {
      router.push("/chat");
    } else {
      setError("メールアドレスがまだ確認されていません");
    }
  };

  const handleLogout = async () => {
    const auth = getClientAuth();
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-card rounded-xl shadow-lg border text-center">
        <h1 className="text-2xl font-semibold">メール確認</h1>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{email}</span>{" "}
          に確認メールを送信しました。メール内のリンクをクリックして認証を完了してください。
        </p>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {sent && (
          <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md dark:text-green-400 dark:bg-green-950">
            確認メールを再送信しました
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={handleCheckVerification} className="w-full">
            確認済みの場合はこちら
          </Button>
          <Button
            variant="outline"
            onClick={handleResend}
            className="w-full"
            disabled={sending}
          >
            {sending ? "送信中..." : "確認メールを再送信"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-muted-foreground"
          >
            ログイン画面に戻る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
