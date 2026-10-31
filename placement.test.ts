import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReadImage, ThreadImages } from "./contract.ts";
import { imagesAbove, threadGallery } from "./placement.ts";

const image = (key: string, readAt: number, turnId = "t1", path = `/shots/${key}.png`): ReadImage =>
  ({ key, path, name: `${key}.png`, url: `/preview/${key}.png`, turnId, readAt });

const data: ThreadImages = {
  messages: [
    { id: "m1", turnId: "t1", startedAt: 100 },
    { id: "m2", turnId: "t1", startedAt: 200 },
    { id: "m3", turnId: "t1", startedAt: 300 },
    { id: "n1", turnId: "t2", startedAt: 500 },
  ],
  images: [image("a", 50), image("b", 150), image("c", 160), image("d", 350), image("e", 450, "t2")],
  expiresAtMs: null,
};

const keys = (images: ReadImage[]) => images.map((it) => it.key);
const above = (id: string, turnId: string | null = "t1", createdAt = 0) => keys(imagesAbove(data, { id, turnId, createdAt }));

test("an image sits above the first message of its turn that began after the read", () => {
  assert.deepEqual(above("m1"), ["a"]);
  assert.deepEqual(above("m2"), ["b", "c"]);
  assert.deepEqual(above("n1", "t2"), ["e"]);
});

test("the turn's last message also takes the images read after it", () => {
  assert.deepEqual(above("m3"), ["d"]);
});

test("a message the scan does not know matches the message of its turn that began nearest it", () => {
  assert.deepEqual(above("unknown", "t1", 205), ["b", "c"]);
  assert.deepEqual(above("unknown", null, 205), []);
  assert.deepEqual(above("unknown", "t9", 205), []);
});

test("the gallery lists every file once at its latest read, newest first", () => {
  const reread: ThreadImages = { ...data, images: [...data.images, image("b2", 600, "t2", "/shots/b.png")] };
  assert.deepEqual(keys(threadGallery(reread)), ["b2", "e", "d", "c", "a"]);
});
