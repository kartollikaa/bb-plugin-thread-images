import type { AgentMessage, ReadImage, ThreadImages } from "./contract";

export interface MessageRef {
  id: string;
  turnId: string | null;
  createdAt: number;
}

/** The scanned message a timeline message is: the same id, else the one of its turn that started nearest it. */
function scannedMessage(messages: readonly AgentMessage[], message: MessageRef): AgentMessage | null {
  // The timeline keys a message as `…|item:<item id>`; the events carry the bare item id.
  const itemId = /\|item:([^|]+)$/.exec(message.id)?.[1] ?? message.id;
  const same = messages.find((candidate) => candidate.id === itemId);
  if (same) return same;
  const ofTurn = messages.filter((candidate) => candidate.turnId === message.turnId);
  if (message.turnId === null || ofTurn.length === 0) return null;
  return ofTurn.reduce((best, candidate) =>
    Math.abs(candidate.startedAt - message.createdAt) < Math.abs(best.startedAt - message.createdAt) ? candidate : best,
  );
}

/**
 * The images to show above an assistant message: those its turn read after the previous message of the turn
 * began and before this one did. The turn's last message also takes the images read after it, so none is lost.
 */
export function imagesAbove(data: ThreadImages, message: MessageRef): ReadImage[] {
  const own = scannedMessage(data.messages, message);
  if (own === null || own.turnId === null) return [];
  const turn = data.messages.filter((candidate) => candidate.turnId === own.turnId)
    .sort((a, b) => a.startedAt - b.startedAt);
  const index = turn.indexOf(own);
  const previous = index > 0 ? turn[index - 1] : undefined;
  const last = index === turn.length - 1;
  return data.images.filter((image) =>
    image.turnId === own.turnId &&
    (previous === undefined || image.readAt > previous.startedAt) &&
    (last || image.readAt <= own.startedAt),
  );
}

/** Every image the thread read, newest first, each file once at its latest read. */
export function threadGallery(data: ThreadImages): ReadImage[] {
  const latest = new Map<string, ReadImage>();
  for (const image of data.images) {
    const seen = latest.get(image.path);
    if (seen === undefined || image.readAt >= seen.readAt) latest.set(image.path, image);
  }
  return [...latest.values()].sort((a, b) => b.readAt - a.readAt);
}
