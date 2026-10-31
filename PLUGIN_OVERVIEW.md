## What you get

- **Inline thumbnails.** When an agent opens a PNG, JPEG, GIF, WebP or BMP file with its file-read tool, the image appears above the agent's next message in that turn. Click one to open it full size and step through the rest with the arrows.
- **A gallery under Changes.** The thread context card gets an Images row with a count. Click the row to show or hide a grid of every image the thread opened, oldest at the top and new ones at the bottom. A file opened several times appears once.

## How it works

The plugin reads the thread's own events, so it needs no setup and works with any agent provider that reports file reads. Images are served from your machine through bb's file previews; nothing is uploaded anywhere.

## Requirements

- The gallery lives in the thread context card, which bb shows while the `threadContextCard` experiment is on.
- An image whose file has since moved or been deleted shows its name instead of a picture.
