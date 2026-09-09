import { toPng } from "html-to-image";

export type Capture = { dataUrl: string; width: number; height: number };

const TRANSPARENT_PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode the captured image."));
    img.src = src;
  });
}

/**
 * Renders the page to an image and crops it to what the learner currently
 * sees. Elements marked `data-screenshot-hide` (the feedback widget itself,
 * cross-origin avatars) are left out.
 */
export async function captureViewport(): Promise<Capture> {
  const { scrollX, scrollY, innerWidth: vw, innerHeight: vh } = window;
  const full = await toPng(document.body, {
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: "#ffffff",
    imagePlaceholder: TRANSPARENT_PX,
    filter: (node) =>
      !(node && typeof (node as Element).hasAttribute === "function" && (node as Element).hasAttribute("data-screenshot-hide")),
  });
  const img = await loadImage(full);

  const canvas = document.createElement("canvas");
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, vw, vh);
  ctx.drawImage(img, -scrollX, -scrollY);
  return { dataUrl: canvas.toDataURL("image/png"), width: vw, height: vh };
}
