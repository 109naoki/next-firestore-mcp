"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError("");
    try {
      const auth = getClientAuth();
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push("/chat");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "ログインに失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-card rounded-xl shadow-lg border">
        <h1 className="text-2xl font-semibold text-center">Sign in</h1>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              {...register("email")}
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              {...register("password")}
              disabled={loading}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            <Link
              href="/forgot-password"
              className="text-primary underline hover:no-underline"
            >
              パスワードをお忘れの方
            </Link>
          </p>
          <p>
            アカウントをお持ちでない方は{" "}
            <Link
              href="/register"
              className="text-primary underline hover:no-underline"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
