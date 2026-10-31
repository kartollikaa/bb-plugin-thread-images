// Read Images: the images an agent read, above the message that follows the read and in the thread context card.
import { useEffect, useState } from "react";
import {
  definePluginApp,
  experimental_ImageLightbox as ImageLightbox,
  experimental_THREAD_INFO_SECTION_GROUPS as SECTION_GROUPS,
  experimental_useRpcQuery as useRpcQuery,
  type ExperimentalMessageMetadataProps,
  type ExperimentalThreadContextCardProps,
} from "@get-bb/plugin-sdk/app";
import { rpcContract, type ReadImage, type ThreadImages } from "./contract";
import { imagesAbove, threadGallery } from "./placement";

// Ask again this long before the image URLs expire, so a thumbnail never breaks while it is on screen.
const RENEW_BEFORE_MS = 60_000;

function useThreadImages(threadId: string): ThreadImages | undefined {
  const query = useRpcQuery({ contract: rpcContract, method: "thread_images", input: { threadId } });
  const expiresAtMs = query.data?.expiresAtMs ?? null;
  useEffect(() => {
    if (expiresAtMs === null) return;
    const timer = setTimeout(() => void query.refetch(), Math.max(0, expiresAtMs - Date.now() - RENEW_BEFORE_MS));
    return () => clearTimeout(timer);
  }, [expiresAtMs, query.refetch]);
  return query.data;
}

function Thumbnail({ image, className, onOpen }: { image: ReadImage; className: string; onOpen(): void }) {
  if (image.url === null) {
    return (
      <div
        title={image.path}
        className={`${className} flex items-center justify-center rounded-md border border-dashed border-border p-1 text-center text-xs text-muted-foreground`}
      >
        {image.name}
      </div>
    );
  }
  return (
    <button
      type="button"
      title={image.path}
      aria-label={`Open ${image.name}`}
      onClick={onOpen}
      className={`${className} overflow-hidden rounded-md border border-border bg-muted transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring`}
    >
      <img src={image.url} alt={image.name} loading="lazy" className="h-full w-full object-contain" />
    </button>
  );
}

/** Opens one of [images] full size and steps through the rest. */
function Lightbox({ images, index, onIndex }: { images: ReadImage[]; index: number | null; onIndex(next: number | null): void }) {
  const shown = index === null ? undefined : images[index];
  if (index === null || shown === undefined) return null;
  return (
    <ImageLightbox
      isOpen
      title={shown.name}
      imageAlt={shown.path}
      imageSrc={shown.url}
      hasMultipleImages={images.length > 1}
      previousDisabled={index === 0}
      nextDisabled={index === images.length - 1}
      navigationStatus={`${index + 1} / ${images.length}`}
      onPrevious={() => onIndex(Math.max(0, index - 1))}
      onNext={() => onIndex(Math.min(images.length - 1, index + 1))}
      onClose={() => onIndex(null)}
    />
  );
}

function ImagesAboveMessage({ message }: ExperimentalMessageMetadataProps) {
  const data = useThreadImages(message.threadId);
  const [open, setOpen] = useState<number | null>(null);
  if (message.role !== "assistant" || data === undefined) return null;
  const images = imagesAbove(data, message);
  if (images.length === 0) return null;
  return (
    <div className="mb-1 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <Thumbnail key={image.key} image={image} className="h-40 max-w-full" onOpen={() => setOpen(index)} />
      ))}
      <Lightbox images={images} index={open} onIndex={setOpen} />
    </div>
  );
}

function ImagesSection({ threadId }: ExperimentalThreadContextCardProps) {
  const data = useThreadImages(threadId);
  const [open, setOpen] = useState<number | null>(null);
  if (data === undefined) return null;
  const images = threadGallery(data);
  if (images.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-1.5 px-1 py-1">
      {images.map((image, index) => (
        <Thumbnail key={image.key} image={image} className="aspect-square w-full" onOpen={() => setOpen(index)} />
      ))}
      <Lightbox images={images} index={open} onIndex={setOpen} />
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_messageMetadata({ id: "read-images", placement: "above", component: ImagesAboveMessage });
  app.slots.experimental_threadContextCardSection({
    id: "read-images",
    title: "Images",
    group: SECTION_GROUPS.storage,
    component: ImagesSection,
  });
});
