/**
 * Converts a browser File object into a Data URL string.
 *
 * Used by CMS create/edit forms to inline-upload image/video assets.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}