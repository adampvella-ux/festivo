import type { Festival } from "@/types/festival";
import { FESTIVAL_MEDIA_GENERATED } from "./festival-media.generated";
import { FESTIVAL_MEDIA_MANUAL } from "./festival-media-manual";

/** Wikimedia imageinfo often appends tracking query params — strip for stable URLs. */
function cleanMediaUrl(u: string): string {
  try {
    const parsed = new URL(u);
    if (parsed.hostname === "upload.wikimedia.org") {
      parsed.search = "";
    }
    return parsed.toString();
  } catch {
    return u;
  }
}

/**
 * Applies image bundles to each festival (Wikimedia / Commons when found, else thematic Unsplash from the generator).
 * Manual entries win over generated.
 */
export function applyFestivalMedia(festival: Festival): Festival {
  const bundle = FESTIVAL_MEDIA_MANUAL[festival.id] ?? FESTIVAL_MEDIA_GENERATED[festival.id];
  if (!bundle) {
    return festival;
  }
  return {
    ...festival,
    imageUrl: cleanMediaUrl(bundle.imageUrl),
    imageGallery: bundle.imageGallery.map((img) => ({
      ...img,
      url: cleanMediaUrl(img.url)
    }))
  };
}
