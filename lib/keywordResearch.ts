/**
 * Keyword research for SEO blog posts: location-based keywords built from the
 * clinic's own category/services/address, plus the questions people actually
 * type into Google, pulled from Google's public autocomplete endpoint (free,
 * no API key). If that endpoint is unreachable, falls back to generic question
 * templates and says so via `source`, so a draft is never passed off as being
 * based on real search data when it isn't.
 */

export type KeywordSource = "google_autocomplete" | "template";

export type KeywordResearch = {
  area: string | null;
  city: string | null;
  topics: string[];
  keywords: string[];
  questions: string[];
  source: KeywordSource;
};

const QUESTION_PREFIXES = ["how", "what", "is", "why", "when", "which", "can", "does"];
const QUESTION_START = /^(how|what|is|are|why|when|which|can|does|do|should|where|who|will)\b/i;
const SUGGEST_URL = "https://suggestqueries.google.com/complete/search";
const MAX_QUESTIONS = 25;

/** "56 Usman Road, T. Nagar, Chennai, Tamil Nadu 600017" -> { area: "T. Nagar", city: "Chennai" } */
export function extractLocation(address: string | null): { area: string | null; city: string | null } {
  if (!address) return { area: null, city: null };
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "india");

  // Trailing "State 600017" (or a bare PIN) isn't useful as a search location.
  if (parts.length > 1 && /\d{6}/.test(parts[parts.length - 1])) parts.pop();

  const city = parts.length >= 2 ? parts[parts.length - 1] : null;
  // The first part is usually the street line, so an area only exists when
  // there's something between it and the city.
  const area = parts.length >= 3 ? parts[parts.length - 2] : null;
  return { area, city };
}

/** Google's firefox-client autocomplete returns ["query", ["suggestion", ...], ...]. */
export function parseSuggestResponse(body: unknown): string[] {
  if (!Array.isArray(body) || !Array.isArray(body[1])) return [];
  return (body[1] as unknown[]).filter((s): s is string => typeof s === "string" && s.trim().length > 0);
}

function isQuestion(text: string): boolean {
  return QUESTION_START.test(text.trim()) || text.trim().endsWith("?");
}

function toQuestion(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
  return capitalized.endsWith("?") ? capitalized : `${capitalized}?`;
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

async function fetchSuggestions(query: string): Promise<string[]> {
  const url = `${SUGGEST_URL}?client=firefox&hl=en&gl=in&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ClinicGrowthBot/1.0)" },
    });
    if (!res.ok) return [];
    return parseSuggestResponse(await res.json());
  } catch {
    return [];
  }
}

/** Run requests a few at a time so we don't hammer the endpoint. */
async function fetchAll(queries: string[], concurrency = 4): Promise<string[][]> {
  const results: string[][] = new Array(queries.length);
  let next = 0;
  async function worker() {
    while (next < queries.length) {
      const i = next++;
      results[i] = await fetchSuggestions(queries[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queries.length) }, worker));
  return results;
}

export function buildTopics(category: string | null, services: string[]): string[] {
  const topics = [category, ...services.slice(0, 4)]
    .filter((t): t is string => !!t && t.trim().length > 1)
    .map((t) => t.trim().toLowerCase());
  return dedupe(topics);
}

export function buildLocationKeywords(topics: string[], area: string | null, city: string | null): string[] {
  const keywords: string[] = [];
  const [primary, ...services] = topics;
  if (primary) {
    if (area) keywords.push(`${primary} in ${area}`, `${primary} near ${area}`);
    if (city) keywords.push(`${primary} in ${city}`);
  }
  for (const service of services) {
    if (city) keywords.push(`${service} in ${city}`, `${service} cost in ${city}`);
    if (area) keywords.push(`${service} in ${area}`);
  }
  return dedupe(keywords.map((k) => k.toLowerCase()));
}

export function templateQuestions(topics: string[], area: string | null, city: string | null): string[] {
  const place = area ?? city ?? "my area";
  const [primary = "clinic", ...services] = topics;
  const questions = [
    `How do I choose a good ${primary} in ${place}?`,
    `What should I expect at my first visit to a ${primary}?`,
    `How often should I visit a ${primary}?`,
  ];
  for (const service of services.slice(0, 3)) {
    // "dental check-ups" is plural, "root canal treatment" isn't.
    const verb = /[^s]s$/i.test(service) ? "do" : "does";
    questions.push(
      city ? `How much ${verb} ${service} cost in ${city}?` : `How much ${verb} ${service} cost?`,
      `How long ${verb} ${service} take?`,
      `How do I prepare for ${service}?`
    );
  }
  return dedupe(questions);
}

/** Questions mentioning the clinic's area or city rank first — they're the location-intent searches. */
function rankQuestions(questions: string[], area: string | null, city: string | null): string[] {
  const locals = [area, city].filter((l): l is string => !!l).map((l) => l.toLowerCase());
  const isLocal = (q: string) => locals.some((l) => q.toLowerCase().includes(l));
  return [...questions.filter(isLocal), ...questions.filter((q) => !isLocal(q))];
}

export async function researchKeywords(params: {
  category: string | null;
  services: string[];
  address: string | null;
}): Promise<KeywordResearch> {
  const { area, city } = extractLocation(params.address);
  const topics = buildTopics(params.category, params.services);
  const baseKeywords = buildLocationKeywords(topics, area, city);

  const questionQueries = topics.flatMap((topic) => QUESTION_PREFIXES.map((p) => `${p} ${topic}`));
  const [keywordResults, questionResults] = await Promise.all([fetchAll(baseKeywords), fetchAll(questionQueries)]);

  const suggestedKeywords = keywordResults.flat().filter((s) => !isQuestion(s));
  const suggestedQuestions = [...questionResults.flat(), ...keywordResults.flat()].filter(isQuestion).map(toQuestion);

  if (suggestedQuestions.length === 0) {
    return {
      area,
      city,
      topics,
      keywords: baseKeywords,
      questions: templateQuestions(topics, area, city),
      source: "template",
    };
  }

  return {
    area,
    city,
    topics,
    keywords: dedupe([...baseKeywords, ...suggestedKeywords.map((k) => k.toLowerCase())]).slice(0, 40),
    questions: rankQuestions(dedupe(suggestedQuestions), area, city).slice(0, MAX_QUESTIONS),
    source: "google_autocomplete",
  };
}
