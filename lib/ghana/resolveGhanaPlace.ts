import { GHANA_REGIONS } from "./regions";

export type GhanaPlaceType =
  | "CITY"
  | "TOWN"
  | "URBAN_AREA"
  | "DISTRICT_CAPITAL"
  | "AREA";

export type GhanaPlace = {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  type: GhanaPlaceType;
};

export type ResolveGhanaPlaceResult = GhanaPlace | GhanaPlace[] | null;

const normalizeQuery = (input: string): string => {
  // Step 1: normalize input
  return input
    .toLowerCase()
    .trim()
    // remove punctuation variations (keep letters/digits/space)
    .replace(/[\u2019']/g, "") // apostrophes
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const CITY_TYPE: GhanaPlaceType = "CITY";
const TOWN_TYPE: GhanaPlaceType = "TOWN";

// INTERNAL DATA FLATTENING (no nested hierarchy exposed externally)
type InternalAllPlacesItem = Omit<GhanaPlace, "type"> & { type: GhanaPlaceType };

const ALL_PLACES: InternalAllPlacesItem[] = GHANA_REGIONS.flatMap((region) => {
  return region.cities.flatMap((city) => {
    const cityPlace: InternalAllPlacesItem[] = [
      {
        name: city.name,
        region: region.name,
        latitude: city.latitude,
        longitude: city.longitude,
        type: CITY_TYPE,
      },
    ];

    const townPlaces: InternalAllPlacesItem[] = (city.towns ?? []).map((town) => ({
      name: town.name,
      region: region.name,
      latitude: town.latitude,
      longitude: town.longitude,
      type: TOWN_TYPE,
    }));

    return [...cityPlace, ...townPlaces];
  });
});

type ResolveOptions = {
  /**
   * Allows fuzzy/partial matching.
   * If disabled, resolver returns null when exact + region+name don't yield a match.
   */
  fuzzyEnabled?: boolean;
};

const scorePartial = (placeNameNormalized: string, normalizedQuery: string) => {
  // Higher score == better.
  // Priority is: prefix > substring > length similarity.
  if (placeNameNormalized === normalizedQuery) return 1000;
  if (placeNameNormalized.startsWith(normalizedQuery)) return 500;
  const idx = placeNameNormalized.indexOf(normalizedQuery);
  if (idx >= 0) return 300 - idx;
  // fallback: token overlap-ish
  const qTokens = new Set(normalizedQuery.split(" ").filter(Boolean));
  const pTokens = new Set(placeNameNormalized.split(" ").filter(Boolean));
  let overlap = 0;
  for (const t of qTokens) if (pTokens.has(t)) overlap++;
  return overlap;
};

const extractRegionToken = (normalizedQuery: string): string | null => {
  // Step 4 (optional): if query includes region + place
  // e.g. "tarkwa western"
  // We'll check last token(s) for a region name match.

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const regionNamesNormalized = new Map(
    GHANA_REGIONS.map((r) => [normalizeQuery(r.name), r.name])
  );

  // Try to match any suffix of tokens to a region name
  for (let start = 0; start < tokens.length; start++) {
    const suffix = tokens.slice(start).join(" ");
    const maybeRegion = regionNamesNormalized.get(suffix);
    if (maybeRegion) return maybeRegion;
  }

  return null;
};

export function resolveGhanaPlace(
  rawQuery: string,
  options: ResolveOptions = {}
): ResolveGhanaPlaceResult {
  const fuzzyEnabled = options.fuzzyEnabled ?? true;

  // guard
  if (!rawQuery || !rawQuery.trim()) return null;

  // Step 1: Normalize input
  const normalizedQuery = normalizeQuery(rawQuery);
  if (!normalizedQuery) return null;

  const candidatesByExact = ALL_PLACES.filter(
    (place) => normalizeQuery(place.name) === normalizedQuery
  );

  // Step 2: exact match first
  if (candidatesByExact.length === 1) return candidatesByExact[0];
  if (candidatesByExact.length > 1) {
    // Multiple exact matches are unusual but allowed by spec.
    return candidatesByExact.slice(0, 10);
  }

  // Step 4: region context resolution (optional)
  // Supports "place region" (e.g. "tarkwa western")
  // Priority: region filter first then exact/partial match inside.
  const maybeRegion = extractRegionToken(normalizedQuery);

  const queryWithoutRegion = maybeRegion
    ? normalizeQuery(
        normalizedQuery
          .replace(new RegExp(`\\b${normalizeQuery(maybeRegion)}\\b`, "g"), " ")
      )
    : normalizedQuery;

  const withinRegion = maybeRegion
    ? ALL_PLACES.filter((p) => p.region === maybeRegion)
    : ALL_PLACES;

  // Step 2b: exact match within region context ("Region + name match")
  const exactWithinRegion = withinRegion.filter(
    (place) => normalizeQuery(place.name) === queryWithoutRegion
  );
  if (exactWithinRegion.length === 1) return exactWithinRegion[0];
  if (exactWithinRegion.length > 1) return exactWithinRegion.slice(0, 10);

  // Step 3: fuzzy match fallback (includes Step 3 partial string match)
  if (!fuzzyEnabled) return null;

  const normalizedQueryToUse = queryWithoutRegion;
  if (!normalizedQueryToUse) return null;

  const partialMatches = withinRegion
    .map((place) => {
      const placeNameNorm = normalizeQuery(place.name);
      const score = scorePartial(placeNameNorm, normalizedQueryToUse);
      return { place, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (partialMatches.length === 0) return null;

  // Spec: return top 5 results, max 10, sorted by relevance.
  const top = partialMatches.slice(0, 5).map((x) => x.place);

  // If only one remains, return single object (Case 1)
  return top.length === 1 ? top[0] : top.slice(0, 10);
}

// Convenience export for app-side usage
export const GHANA_PLACE_RESOLVER = {
  resolveGhanaPlace,
};

