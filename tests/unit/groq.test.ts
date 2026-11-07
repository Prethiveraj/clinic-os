import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { groqJson, AiGenerationError } from "@/lib/groq";
import { MissingEnvError } from "@/lib/env";
import { json, mockFetch, withEnv } from "./helpers";

const schema = z.object({ reply: z.string().min(1) });
const call = () => groqJson({ system: "sys", user: "usr", shape: `{ "reply": string }`, schema });
const completion = (content: string) => json({ choices: [{ message: { content } }] });

test("sends an OpenAI-compatible JSON-mode request to Groq with the configured model", withEnv({ GROQ_API_KEY: "gsk_test", GROQ_MODEL: "llama-3.1-8b-instant" }, async () => {
  const m = mockFetch(() => completion(`{"reply":"Thank you!"}`));
  try {
    assert.deepEqual(await call(), { reply: "Thank you!" });
    assert.equal(m.calls[0].url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal((m.calls[0].init.headers as Record<string, string>).Authorization, "Bearer gsk_test");
    const body = JSON.parse(m.calls[0].init.body as string);
    assert.equal(body.model, "llama-3.1-8b-instant");
    assert.equal(body.reasoning_effort, undefined); // only sent to gpt-oss models
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.match(body.messages[1].content, /exactly this shape/);
  } finally {
    m.restore();
  }
}));

test("defaults to openai/gpt-oss-120b with low reasoning effort", withEnv({ GROQ_API_KEY: "k", GROQ_MODEL: undefined }, async () => {
  const m = mockFetch(() => completion(`{"reply":"ok"}`));
  try {
    await call();
    const body = JSON.parse(m.calls[0].init.body as string);
    assert.equal(body.model, "openai/gpt-oss-120b");
    assert.equal(body.reasoning_effort, "low");
  } finally {
    m.restore();
  }
}));

test("retries once with the validation error when the shape is wrong", withEnv({ GROQ_API_KEY: "k" }, async () => {
  const answers = [`{"answer":"wrong key"}`, `{"reply":"fixed"}`];
  const m = mockFetch(() => completion(answers.shift()!));
  try {
    assert.deepEqual(await call(), { reply: "fixed" });
    const second = JSON.parse(m.calls[1].init.body as string).messages;
    assert.match(second.at(-1).content, /did not match the required shape \(reply: Invalid input/);
  } finally {
    m.restore();
  }
}));

test("retries Groq's json_validate_failed, but not other API errors", withEnv({ GROQ_API_KEY: "k" }, async () => {
  let n = 0;
  const m = mockFetch(() => (n++ === 0 ? json({ error: { code: "json_validate_failed" } }, 400) : completion(`{"reply":"ok"}`)));
  try {
    assert.deepEqual(await call(), { reply: "ok" });
  } finally {
    m.restore();
  }
  const m2 = mockFetch(() => json({ error: { message: "Invalid API Key" } }, 401));
  try {
    await assert.rejects(call(), (e: Error) => e instanceof AiGenerationError && /Groq 401/.test(e.message));
    assert.equal(m2.calls.length, 1);
  } finally {
    m2.restore();
  }
}));

test("gives up after two invalid answers", withEnv({ GROQ_API_KEY: "k" }, async () => {
  const m = mockFetch(() => completion("not json"));
  try {
    await assert.rejects(call(), /failed validation twice/);
  } finally {
    m.restore();
  }
}));

test("a missing GROQ_API_KEY fails with a clear message", withEnv({ GROQ_API_KEY: undefined }, async () => {
  await assert.rejects(call(), (e: Error) => e instanceof MissingEnvError && /GROQ_API_KEY is not set/.test(e.message));
}));
