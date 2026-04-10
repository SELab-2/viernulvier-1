import z from "zod";

export const MAX_SEARCH_LENGTH = 200;
export const MAX_SEARCH_TERMS = 20;

export const SearchParamSchema = z
  .preprocess((val: unknown): string[] | undefined => {
    if (val === undefined || val === null) return undefined;
    const raw = Array.isArray(val) ? val : [val];
    const trimmed = raw
      .filter((x): x is string => typeof x === "string")
      .flatMap((s) => s.split(","))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.array(z.string().max(MAX_SEARCH_LENGTH)).max(MAX_SEARCH_TERMS).optional())
  .transform((arr): string[] | undefined => {
    if (!arr || arr.length === 0) return undefined;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of arr) {
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out;
  });
