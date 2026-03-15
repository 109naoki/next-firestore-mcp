import "server-only";
import { getAdminFirestore } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Thread, ChatMessage } from "./types";

export const createThread = async (
  userId: string,
  title: string = "New Chat",
  model: string = "claude-sonnet-4-5",
): Promise<string> => {
  const db = getAdminFirestore();
  const ref = await db.collection("threads").add({
    userId,
    title,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastMessagePreview: "",
    model,
  });
  return ref.id;
};

export const getUserThreads = async (userId: string): Promise<Thread[]> => {
  const db = getAdminFirestore();
  const snap = await db
    .collection("threads")
    .where("userId", "==", userId)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Thread, "id">),
  }));
};

export const getThreadMessages = async (
  threadId: string,
): Promise<ChatMessage[]> => {
  const db = getAdminFirestore();
  const snap = await db
    .collection("threads")
    .doc(threadId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ChatMessage, "id">),
  }));
};

export const updateThreadTitle = async (
  threadId: string,
  title: string,
): Promise<void> => {
  const db = getAdminFirestore();
  await db.collection("threads").doc(threadId).update({ title });
};

export const deleteThread = async (threadId: string): Promise<void> => {
  const db = getAdminFirestore();
  const messagesSnap = await db
    .collection("threads")
    .doc(threadId)
    .collection("messages")
    .get();

  const batch = db.batch();
  messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection("threads").doc(threadId));
  await batch.commit();
};
