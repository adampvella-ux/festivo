import type { Festival } from "@/types/festival";
import type { FestivalCopyBundle } from "./festival-content.generated";
import { FESTIVAL_COPY_GENERATED } from "./festival-content.generated";
import { FESTIVAL_COPY_MANUAL } from "./festival-content-manual";

function mergeCopy(id: string): FestivalCopyBundle | undefined {
  const gen = FESTIVAL_COPY_GENERATED[id];
  if (!gen) return undefined;
  const manual = FESTIVAL_COPY_MANUAL[id];
  return manual ? { ...gen, ...manual } : gen;
}

/**
 * Applies sourced descriptions and travel notes from generated + manual layers.
 */
export function applyFestivalCopy(festival: Festival): Festival {
  const bundle = mergeCopy(festival.id);
  if (!bundle) {
    return festival;
  }
  return {
    ...festival,
    description: bundle.description,
    travelNotes: bundle.travelNotes
  };
}
