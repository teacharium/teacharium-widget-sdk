const HASH_ALGORITHM = "SHA-256";

/**
 * Compute a stable hash for voiceover content so the same script
 * reuses cached audio. Relies solely on browser-compatible Web Crypto APIs.
 */
export async function getVoiceoverHash(content: string) {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error("Web Crypto is not available to compute voiceover hashes");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const digest = await subtle.digest(HASH_ALGORITHM, data);
  const bytes = new Uint8Array(digest);

  let hash = "";
  for (let index = 0; index < bytes.length; index += 1) {
    hash += bytes[index].toString(16).padStart(2, "0");
  }

  return hash;
}
