import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteFile, publicFileUrl, uploadFile } from "@/lib/storage";
import { mockFetch, withEnv } from "./helpers";

const env = { SUPABASE_URL: "https://abc.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: "service-key", SUPABASE_STORAGE_BUCKET: "clinic-photos" };

test("uploads with the service-role key and returns the public URL", withEnv(env, async () => {
  const m = mockFetch(() => new Response("{}", { status: 200 }));
  try {
    const url = await uploadFile({ path: "clinics/p 1/photos/0.jpg", body: Buffer.from([1, 2, 3]), contentType: "image/jpeg" });
    assert.equal(url, "https://abc.supabase.co/storage/v1/object/public/clinic-photos/clinics/p%201/photos/0.jpg");
    assert.equal(m.calls[0].url, "https://abc.supabase.co/storage/v1/object/clinic-photos/clinics/p%201/photos/0.jpg");
    const h = m.calls[0].init.headers as Record<string, string>;
    assert.equal(h.Authorization, "Bearer service-key");
    assert.equal(h["x-upsert"], "true");
    assert.equal(h["Content-Type"], "image/jpeg");
    assert.equal(m.calls[0].init.method, "POST");
  } finally {
    m.restore();
  }
}));

test("surfaces Supabase errors", withEnv(env, async () => {
  const m = mockFetch(() => new Response(`{"message":"Bucket not found"}`, { status: 404 }));
  try {
    await assert.rejects(uploadFile({ path: "a.txt", body: Buffer.from("x"), contentType: "text/plain" }), /Supabase upload failed: 404.*Bucket not found/);
    await assert.rejects(deleteFile("a.txt"), /Supabase delete failed: 404/);
  } finally {
    m.restore();
  }
}));

test("public URL needs no network call", withEnv(env, () => {
  assert.equal(publicFileUrl("x.png"), "https://abc.supabase.co/storage/v1/object/public/clinic-photos/x.png");
}));

test("new sb_secret_ keys go only in the apikey header", withEnv({ ...env, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_abc" }, async () => {
  const m = mockFetch(() => new Response("{}", { status: 200 }));
  try {
    await uploadFile({ path: "a.txt", body: Buffer.from("x"), contentType: "text/plain" });
    const h = m.calls[0].init.headers as Record<string, string>;
    assert.equal(h.apikey, "sb_secret_abc");
    assert.equal(h.Authorization, undefined);
  } finally {
    m.restore();
  }
}));
