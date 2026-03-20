"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const forgotPasswordSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage = () => {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true);
    setError("");
    try {
      const auth = getClientAuth();
      await sendPasswordResetEmail(auth, data.email);
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "パスワードリセットメールの送信に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-card rounded-xl shadow-lg border">
        <h1 className="text-2xl font-semibold text-center">
          パスワードをお忘れの方
        </h1>

        {success ? (
          <div className="space-y-4">
            <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md dark:text-green-300 dark:bg-green-900/30">
              パスワードリセット用のメールを送信しました。メールに記載されたリンクからパスワードを再設定してください。
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="text-primary underline hover:no-underline"
              >
                ログインに戻る
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">
              登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
            </p>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="メールアドレス"
                  {...register("email")}
                  disabled={loading}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "送信中..." : "リセットメールを送信"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="text-primary underline hover:no-underline"
              >
                ログインに戻る
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
