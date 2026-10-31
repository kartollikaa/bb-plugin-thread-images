# Thread Images

A [bb](https://getbb.app) plugin that shows the images an agent opens with its file-read tool:

- above the agent's next message in the same turn, with a full-size viewer;
- in a collapsible **Images** row under **Changes** in the thread context card, oldest first.

## Install

```sh
bb plugin install https://github.com/kartollikaa/bb-plugin-thread-images.git
```

## Develop

```sh
npm install
npm test
npm run typecheck
bb plugin build
bb plugin install . --yes
```

- `server.ts` scans the thread's `item/started` and `item/completed` events for image file reads and agent messages, and serves the images' folders through `bb.sdk.files.createPreview`.
- `placement.ts` decides which images sit above which message, and the gallery order.
- `app.tsx` renders the inline thumbnails (`experimental_messageMetadata`) and the card row (`experimental_threadContextCardRow`).

## License

MIT
