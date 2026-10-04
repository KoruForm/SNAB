export const MAX_PHOTOS = 40;
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export function validatePhotoBatch(files: File[]): File[] {
  const valid = files.filter(f => f.type.startsWith("image/"));
  if (!valid.length) throw new Error("Choose image files to add to your sale.");
  if (valid.some(f => f.size > MAX_PHOTO_BYTES)) throw new Error("Each photo needs to be smaller than 20 MB. Choose a smaller version and try again.");
  return valid;
}
export function tooManyPhotos(): Error { return new Error(`Keep each draft to ${MAX_PHOTOS} photos for this early build.`); }
