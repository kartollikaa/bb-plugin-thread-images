const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

export function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") && IMAGE_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
}

/**
 * The image a completed item opened, or null when it opened none. Keyed on the item's `path`, not its type,
 * because each provider names its own: fileRead (Claude Code, ACP), imageView (Codex, Pi), imageGeneration.
 */
export function imageReadOf(item: Record<string, unknown>): { id: string; path: string } | null {
  if (typeof item.id !== "string" || typeof item.path !== "string" || !isImagePath(item.path)) return null;
  // imageView carries no status: completing it is the view.
  if (item.status !== undefined && item.status !== "completed") return null;
  return { id: item.id, path: item.path };
}
