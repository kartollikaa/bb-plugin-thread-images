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

// Codex views an image with an item of its own that has no status.
const codexImageView = {
  type: "imageView",
  id: "dafd348ec5-i47",
  path: "/tmp/u18-diala.png",
  presentation: { label: { completed: "Viewed image" }, icon: { glyph: "Eye" }, title: "u18-diala.png" },
};

// Pi reports a successful read of an image as an imageView, too.
const piImageView = { type: "imageView", id: "call_7f2", parentToolCallId: "call_1aa", path: "/work/screens/login.webp" };

// ACP agents go through the SDK bridge, which turns a `read` tool call into a fileRead.
const acpRead = { type: "fileRead", id: "acp-tc-3", status: "completed", path: "/work/diagram.JPG", cmd: "Read diagram.JPG" };

const codexImageGeneration = {
  type: "imageGeneration",
  id: "dabfc0a345-i44",
  status: "completed",
  prompt: "a gray mouse",
  path: "/tmp/generated/mouse.png",
  error: null,
  transparentBackground: false,
};

test("Claude Code: a completed Read of an image", () => {
  assert.deepEqual(imageReadOf(claudeCodeRead), { id: "toolu_01AbC", path: "/tmp/shots/home.png" });
});

test("a read that failed, or of a file that is not an image, opens no image", () => {
  assert.equal(imageReadOf({ ...claudeCodeRead, status: "failed" }), null);
  assert.equal(imageReadOf({ ...claudeCodeRead, path: "/tmp/notes.md" }), null);
  assert.equal(imageReadOf({ ...claudeCodeRead, path: "/tmp/png" }), null);
});

test("Codex: a viewed image, though the item has no status", () => {
  assert.deepEqual(imageReadOf(codexImageView), { id: "dafd348ec5-i47", path: "/tmp/u18-diala.png" });
});

test("Pi: a viewed image", () => {
  assert.deepEqual(imageReadOf(piImageView), { id: "call_7f2", path: "/work/screens/login.webp" });
});

test("ACP: a read bridged into a fileRead", () => {
  assert.deepEqual(imageReadOf(acpRead), { id: "acp-tc-3", path: "/work/diagram.JPG" });
});

test("Codex: a generated image, once it is done", () => {
  assert.deepEqual(imageReadOf(codexImageGeneration), { id: "dabfc0a345-i44", path: "/tmp/generated/mouse.png" });
  assert.equal(imageReadOf({ ...codexImageGeneration, status: "pending" }), null);
  assert.equal(imageReadOf({ ...codexImageGeneration, path: null }), null);
});

test("an item without an id or a path opens no image", () => {
  assert.equal(imageReadOf({ ...codexImageView, id: undefined }), null);
  assert.equal(imageReadOf({ type: "fileChange", id: "x", changes: [{ path: "/tmp/a.png" }] }), null);
});
