const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

export function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") && IMAGE_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
}

/** The image a completed item opened, or null when it opened none. */
export function imageReadOf(item: Record<string, unknown>): { id: string; path: string } | null {
  if (
    typeof item.id === "string" &&
    item.type === "fileRead" &&
    item.status === "completed" &&
    typeof item.path === "string" &&
    isImagePath(item.path)
  ) {
    return { id: item.id, path: item.path };
  }
  return null;
}
