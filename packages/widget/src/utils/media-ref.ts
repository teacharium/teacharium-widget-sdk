/**
 * Media references stored in lesson content.
 *
 *   media:<uuid>          original image/audio from the media library
 *   media:<uuid>?w=960    image wanted at about 960px wide; the host serves
 *                         the next standard width up (see MEDIA_VARIANT_WIDTHS)
 *   video:<uuid>          a processed video
 *
 * A bare uuid is accepted too and treated as a media reference.
 */

/** Standard widths images get resized to. 400 is the library thumbnail. */
export const MEDIA_VARIANT_WIDTHS = [200, 400, 960, 1440] as const;
export type MediaVariantWidth = (typeof MEDIA_VARIANT_WIDTHS)[number];

export interface ParsedMediaRef {
  kind: "media" | "video";
  id: string;
  /** Requested display width in px, if the reference asked for one */
  width?: number;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const REF_RE = new RegExp(`^(?:(media|video):)?(${UUID})(?:\\?w=(\\d{1,5}))?$`, "i");

/**
 * Global pattern for media references inside serialized content (JSON or
 * MDX text). Group 1 is the uuid, group 2 the optional width.
 */
export const MEDIA_REF_PATTERN = new RegExp(`media:(${UUID})(?:\\?w=(\\d{1,5}))?`, "gi");

/** Parse a stored reference. Returns null for anything that isn't one. */
export function parseMediaRef(value: unknown): ParsedMediaRef | null {
  if (typeof value !== "string") return null;
  const match = REF_RE.exec(value.trim());
  if (!match) return null;
  const kind = (match[1]?.toLowerCase() ?? "media") as "media" | "video";
  const id = match[2].toLowerCase();
  // Videos don't take a width.
  if (kind === "video") return match[3] ? null : { kind, id };
  const width = match[3] ? Number(match[3]) : undefined;
  return width && width > 0 ? { kind, id, width } : { kind, id };
}

/** Build a `media:<uuid>` reference, with `?w=` when a width is given. */
export function formatMediaRef(id: string, width?: number | null): string {
  return width && width > 0 ? `media:${id}?w=${Math.round(width)}` : `media:${id}`;
}

/**
 * Pick the standard width to serve for a requested width: the smallest
 * standard width at or above the request. Returns null when the original
 * should be served instead (no width requested, the request is above the
 * largest standard width, or the original isn't wider than that size).
 */
export function pickVariantWidth(
  requested: number | undefined | null,
  originalWidth?: number | null,
): MediaVariantWidth | null {
  if (!requested || requested <= 0) return null;
  const width = MEDIA_VARIANT_WIDTHS.find((w) => w >= requested);
  if (!width) return null;
  if (originalWidth && originalWidth <= width) return null;
  return width;
}
