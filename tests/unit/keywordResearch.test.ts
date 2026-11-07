import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLocationKeywords, extractLocation, parseSuggestResponse, templateQuestions } from "@/lib/keywordResearch";

test("extracts area and city from an Indian address", () => {
  assert.deepEqual(extractLocation("56 Usman Road, T. Nagar, Chennai, Tamil Nadu 600017"), { area: "T. Nagar", city: "Chennai" });
  assert.deepEqual(extractLocation(null), { area: null, city: null });
});

test("builds lowercase category and service keywords for the area and city", () => {
  const kws = buildLocationKeywords(["dental clinic", "root canal treatment"], "T. Nagar", "Chennai");
  assert.ok(kws.includes("dental clinic in t. nagar"));
  assert.ok(kws.includes("dental clinic near t. nagar"));
  assert.ok(kws.includes("root canal treatment cost in chennai"));
});

test("parses Google autocomplete's [query, [suggestions]] response", () => {
  assert.deepEqual(parseSuggestResponse(["how", ["how much is a root canal", "how to brush"]]), ["how much is a root canal", "how to brush"]);
  assert.deepEqual(parseSuggestResponse({ unexpected: true }), []);
});

test("template questions use correct verb agreement", () => {
  const qs = templateQuestions(["dental clinic", "dental check-ups"], "T. Nagar", "Chennai");
  assert.ok(qs.some((q) => q === "How much do dental check-ups cost in Chennai?"), qs.join(" | "));
});
