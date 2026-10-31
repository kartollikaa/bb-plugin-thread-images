// The one RPC the app reads, shared by server.ts and app.tsx.
import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

const imageSchema = z.object({
  /** The read's item id: unique per read, stable across reloads. */
  key: z.string(),
  path: z.string(),
  name: z.string(),
  /** Null when the file's folder cannot be served (missing, or not on this machine). */
  url: z.string().nullable(),
  turnId: z.string().nullable(),
  readAt: z.number(),
});
export type ReadImage = z.infer<typeof imageSchema>;

const messageSchema = z.object({
  id: z.string(),
  turnId: z.string().nullable(),
  startedAt: z.number(),
});
export type AgentMessage = z.infer<typeof messageSchema>;

export function threadTag(threadId: string): string {
  return `thread:${threadId}`;
}

export const rpcContract = defineRpcContract({
  thread_images: {
    input: z.object({ threadId: z.string().min(1) }),
    tags: ({ threadId }) => [threadTag(threadId)],
    output: z.object({
      images: z.array(imageSchema),
      messages: z.array(messageSchema),
      /** When the earliest image URL stops working; the app asks again before then. */
      expiresAtMs: z.number().nullable(),
    }),
  },
});
export type ThreadImages = z.infer<typeof rpcContract.thread_images.output>;
