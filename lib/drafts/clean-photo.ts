// Photos can carry GPS coordinates and other camera metadata that would reveal a seller's home.
// Redrawing the pixels onto a canvas drops all of it (orientation is applied while decoding),
// and caps the size so uploads stay quick on mobile data.
export const MAX_PHOTO_EDGE = 2560;
const CLEAN_TYPE = "image/jpeg";

export async function cleanPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error(`This browser can’t prepare ${file.name || "a photo"} for upload. Choose a JPG or PNG version and try again.`);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can’t prepare photos for upload. Try a current browser.");
  context.fillStyle = "#fff"; context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: CLEAN_TYPE, quality: 0.88 });
  const name = `${(file.name || "photo").replace(/\.[^.]*$/, "")}.jpg`;
  return new File([blob], name, { type: CLEAN_TYPE });
}
