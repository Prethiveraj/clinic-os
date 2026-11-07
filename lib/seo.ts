/** Structured data is built from confirmed facts, never accepted from the model. */
export function clinicJsonLd(p:{name:string;category?:string|null;address?:string|null;phone?:string|null},url?:string|null) {
  return {'@context':'https://schema.org','@type':/dent/i.test(p.category||'')?'Dentist':'MedicalClinic',name:p.name,...(p.address?{address:p.address}:{}),...(p.phone?{telephone:p.phone}:{}),...(url?{url}: {})};
}
export function serviceSlug(value:string) {return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
export function enforceContentSafety(value:unknown) {
  const text=JSON.stringify(value);
  if(/\b(guaranteed results|painless|risk.free|miracle cure|100% success|best clinic|top.rated)\b|(?:₹|\bINR\s*|\bRs\.?\s*)\d/i.test(text))throw new Error('The generated draft contains a prohibited claim. Please regenerate and review it.');
}
