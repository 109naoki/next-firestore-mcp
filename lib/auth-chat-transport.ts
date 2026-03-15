import { DefaultChatTransport } from "ai";
import { getClientAuth } from "./firebase-client";

export const createAuthChatTransport = (options: {
  threadId: string;
  model: string;
}) => {
  return new DefaultChatTransport({
    api: "/api/chat",
    body: {
      threadId: options.threadId,
      model: options.model,
    },
    fetch: async (url, init) => {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${idToken}`);
        return globalThis.fetch(url, { ...init, headers });
      }
      return globalThis.fetch(url, init);
    },
  });
};
