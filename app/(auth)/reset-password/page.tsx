"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!oobCode) {
      setError("無効なリセットリンクです。もう一度パスワードリセットをお試しください。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const auth = getClientAuth();
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, data.password);
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "パスワードのリセットに失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-card rounded-xl shadow-lg border">
          <h1 className="text-2xl font-semibold text-center">
            無効なリンク
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            このリンクは無効です。もう一度パスワードリセットをお試しください。
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="text-primary underline hover:no-underline"
            >
              パスワードリセットに戻る
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-card rounded-xl shadow-lg border">
        <h1 className="text-2xl font-semibold text-center">
          パスワードの再設定
        </h1>

        {success ? (
          <div className="space-y-4">
            <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md dark:text-green-300 dark:bg-green-900/30">
              パスワードが正常に再設定されました。新しいパスワードでログインしてください。
            </div>
            <Button
              className="w-full"
              onClick={() => router.push("/login")}
            >
              ログインへ
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">
              新しいパスワードを入力してください。
            </p>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="新しいパスワード"
                  {...register("password")}
                  disabled={loading}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="新しいパスワード（確認）"
                  {...register("confirmPassword")}
                  disabled={loading}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "再設定中..." : "パスワードを再設定"}
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

const ResetPasswordPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
};

export default ResetPasswordPage;
