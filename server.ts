// Thread Images: finds the images an agent opened with its file-read tool and serves them to the app.
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { rpcContract, threadTag, type AgentMessage, type ReadImage } from "./contract";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);
// The most events bb returns in one page.
const PAGE = 100;
const PREVIEW_TTL_MS = 60 * 60 * 1000;
const PREVIEW_RENEW_MS = 5 * 60 * 1000;

interface Scan {
  lastSeq: number;
  reads: Omit<ReadImage, "url">[];
  messages: AgentMessage[];
}

const emptyScan = (): Scan => ({ lastSeq: 0, reads: [], messages: [] });

interface Preview {
  baseUrl: string;
  expiresAtMs: number;
}

function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") && IMAGE_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
}

function splitPath(path: string): { dir: string; name: string } {
  const slash = path.lastIndexOf("/");
  return { dir: slash <= 0 ? "/" : path.slice(0, slash), name: path.slice(slash + 1) };
}

/** The item an `item/started` or `item/completed` event carries, read defensively. */
function itemOf(row: { data?: unknown }): Record<string, unknown> | null {
  const item = (row.data as { item?: unknown } | undefined)?.item;
  return item !== null && typeof item === "object" ? (item as Record<string, unknown>) : null;
}

function turnOf(row: { scope?: unknown }): string | null {
  const turnId = (row.scope as { turnId?: unknown } | undefined)?.turnId;
  return typeof turnId === "string" ? turnId : null;
}

export default async function plugin(bb: BbPluginApi) {
  const scans = new Map<string, Scan>();
  const previews = new Map<string, Preview>();
  const scanning = new Map<string, Promise<boolean>>();

  /** Reads the thread's events since the last scan; true when what the app shows changed. */
  async function scanThread(threadId: string): Promise<boolean> {
    const running = scanning.get(threadId);
    if (running) return running;
    const work = (async () => {
      const scan = scans.get(threadId) ?? emptyScan();
      scans.set(threadId, scan);
      let changed = false;
      for (;;) {
        const rows = await bb.sdk.threads.events.list({
          threadId,
          types: ["item/started", "item/completed"],
          order: "asc",
          afterSeq: String(scan.lastSeq),
          limit: String(PAGE),
        });
        for (const row of rows) {
          scan.lastSeq = Math.max(scan.lastSeq, Number(row.seq));
          const item = itemOf(row);
          if (item === null || typeof item.id !== "string") continue;
          if (row.type === "item/started" && item.type === "agentMessage") {
            scan.messages.push({ id: item.id, turnId: turnOf(row), startedAt: Number(row.createdAt) });
            // A new message takes the images read since the one before it, so they move above it.
            if (scan.reads.length > 0) changed = true;
          } else if (
            row.type === "item/completed" &&
            item.type === "fileRead" &&
            item.status === "completed" &&
            typeof item.path === "string" &&
            isImagePath(item.path) &&
            !scan.reads.some((read) => read.key === item.id)
          ) {
            scan.reads.push({
              key: item.id,
              path: item.path,
              name: splitPath(item.path).name,
              turnId: turnOf(row),
              readAt: Number(row.createdAt),
            });
            changed = true;
          }
        }
        if (rows.length < PAGE) return changed;
      }
    })();
    scanning.set(threadId, work);
    try {
      return await work;
    } finally {
      scanning.delete(threadId);
    }
  }

  async function previewOf(dir: string): Promise<Preview | null> {
    const cached = previews.get(dir);
    if (cached && cached.expiresAtMs - Date.now() > PREVIEW_RENEW_MS) return cached;
    try {
      const preview = await bb.sdk.files.createPreview({ rootPath: dir, ttlMs: PREVIEW_TTL_MS });
      previews.set(dir, preview);
      return preview;
    } catch (cause) {
      bb.log.warn(`cannot serve ${dir}: ${String(cause)}`);
      previews.delete(dir);
      return null;
    }
  }

  bb.rpc.register(rpcContract, {
    thread_images: async ({ threadId }) => {
      await scanThread(threadId);
      const scan = scans.get(threadId) ?? emptyScan();
      let expiresAtMs: number | null = null;
      const images: ReadImage[] = [];
      for (const read of scan.reads) {
        const { dir, name } = splitPath(read.path);
        const preview = await previewOf(dir);
        if (preview) expiresAtMs = Math.min(expiresAtMs ?? Infinity, preview.expiresAtMs);
        // The read's key busts the browser cache: a file read again may have changed in between.
        const url = preview
          ? `${preview.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(name)}?read=${encodeURIComponent(read.key)}`
          : null;
        images.push({ ...read, url });
      }
      return { images, messages: scan.messages, expiresAtMs };
    },
  });

  // Only threads someone has looked at are followed, so an unopened thread costs nothing.
  bb.events.on("experimental_thread.events", async ({ thread }) => {
    if (!scans.has(thread.id)) return;
    if (await scanThread(thread.id)) bb.rpc.experimental_invalidate([threadTag(thread.id)]);
  });

  bb.onDispose(() => {
    scans.clear();
    previews.clear();
  });
}
