import { requireEnv } from "@/lib/env";

/**
 * Supabase Storage over its REST API. The bucket must be public so clinic
 * sites can show photos by URL; uploads use the service-role key and only
 * ever run on the server.
 */
function config() {
  return {
    url: requireEnv("SUPABASE_URL").replace(/\/$/, ""),
    key: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    bucket: requireEnv("SUPABASE_STORAGE_BUCKET"),
  };
}

/**
 * Legacy service_role keys are JWTs and go in both headers. New-style secret
 * keys (sb_secret_...) are not JWTs: Supabase wants them in `apikey` only.
 */
function authHeaders(key: string): Record<string, string> {
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function publicFileUrl(path: string): string {
  const { url, bucket } = config();
  return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodePath(path)}`;
}

/** Uploads (or overwrites) one file and returns its public URL. */
export async function uploadFile(params: { path: string; body: Buffer; contentType: string }): Promise<string> {
  const { url, key, bucket } = config();
  const res = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(params.path)}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      ...authHeaders(key),
      "Content-Type": params.contentType,
      "x-upsert": "true",
      "cache-control": "max-age=31536000",
    },
    body: new Uint8Array(params.body),
  });
  if (!res.ok) throw new Error(`Supabase upload failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return publicFileUrl(params.path);
}

export async function deleteFile(path: string): Promise<void> {
  const { url, key, bucket } = config();
  const res = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(path)}`, {
    method: "DELETE",
    cache: "no-store",
    headers: authHeaders(key),
  });
  if (!res.ok) throw new Error(`Supabase delete failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
}

/** Downloads a Google Places photo and re-hosts it under the clinic's folder. */
export async function mirrorPlacesPhoto(sourceUrl: string, namespace: string, index: number): Promise<string> {
  const res = await fetch(sourceUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch source photo: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return uploadFile({
    path: `clinics/${namespace}/photos/${index}.${ext}`,
    body: Buffer.from(await res.arrayBuffer()),
    contentType,
  });
}
