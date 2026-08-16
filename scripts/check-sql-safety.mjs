import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "supabase");
const files = (await readdir(root)).filter((file) => file.endsWith(".sql"));
const forbidden = [
  { label: "DROP TABLE", pattern: /\bdrop\s+table\b/i },
  { label: "DROP SCHEMA", pattern: /\bdrop\s+schema\b/i },
  { label: "TRUNCATE", pattern: /\btruncate(?:\s+table)?\b/i },
  { label: "unbounded DELETE", pattern: /\bdelete\s+from\s+[\w.]+\s*;/i },
  { label: "database-wide read-only toggle", pattern: /\balter\s+database\b[\s\S]*\bdefault_transaction_read_only\b/i }
];
const failures = [];

for (const file of files) {
  const sql = await readFile(path.join(root, file), "utf8");
  for (const rule of forbidden) if (rule.pattern.test(sql)) failures.push(`${file}: ${rule.label}`);
}

if (failures.length) {
  console.error("Potentially destructive SQL requires a separately reviewed recovery procedure:\n" + failures.join("\n"));
  process.exit(1);
}
console.log(`SQL safety check passed for ${files.length} files.`);
