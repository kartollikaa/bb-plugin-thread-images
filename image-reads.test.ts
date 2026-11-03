import assert from "node:assert/strict";
import { test } from "node:test";
import { imageReadOf } from "./image-reads.ts";

// Each fixture is the `item` of an `item/completed` event as bb stores it for that provider.
const claudeCodeRead = {
  type: "fileRead",
  id: "toolu_01AbC",
  status: "completed",
  path: "/tmp/shots/home.png",
  presentation: { label: { completed: "Read", pending: "Reading" }, icon: { glyph: "FileText" } },
};

test("Claude Code: a completed Read of an image", () => {
  assert.deepEqual(imageReadOf(claudeCodeRead), { id: "toolu_01AbC", path: "/tmp/shots/home.png" });
});

test("a read that failed, or of a file that is not an image, opens no image", () => {
  assert.equal(imageReadOf({ ...claudeCodeRead, status: "failed" }), null);
  assert.equal(imageReadOf({ ...claudeCodeRead, path: "/tmp/notes.md" }), null);
  assert.equal(imageReadOf({ ...claudeCodeRead, path: "/tmp/png" }), null);
});
