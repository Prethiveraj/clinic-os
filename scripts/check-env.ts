import "dotenv/config";
import { REQUIRED_ENV } from "@/lib/env";

let missing = 0;
for (const [group, names] of Object.entries(REQUIRED_ENV)) {
  const absent = names.filter((n) => !process.env[n]?.trim());
  missing += absent.length;
  console.log(`${absent.length ? "✗" : "✓"} ${group}${absent.length ? `: missing ${absent.join(", ")}` : ""}`);
}
if (missing) {
  console.log(`\n${missing} variable(s) missing. See .env.example and README.md.`);
  process.exit(1);
}
console.log("\nAll required variables are set. Next: npm run verify:integrations");
