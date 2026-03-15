"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { ThreadSerialized } from "@/lib/types";

export const useThreads = () => {
  const { authFetch, isLoading, isAuthenticated } = useAuth();

  return useQuery<ThreadSerialized[]>({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await authFetch("/api/threads");
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
    enabled: !isLoading && isAuthenticated,
  });
};

export const useDeleteThread = () => {
  const queryClient = useQueryClient();
  const { authFetch } = useAuth();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const res = await authFetch("/api/threads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      if (!res.ok) throw new Error("Failed to delete thread");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
};

export const useInvalidateThreads = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["threads"] });
};
