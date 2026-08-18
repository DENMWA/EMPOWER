import { spawnSync } from "node:child_process";
import { loadLiveSecurityTestConfig } from "./live-supabase-test-config.mjs";

const mutationsEnabled = process.argv.includes("--mutations");
const env = {
  ...process.env,
  RUN_SUPABASE_INTEGRATION_TESTS: "1",
  RUN_SUPABASE_MUTATION_TESTS: mutationsEnabled ? "1" : "0"
};

try {
  const { projectRef } = loadLiveSecurityTestConfig(env);
  process.stdout.write(`Live tenant security preflight passed for Supabase project ${projectRef}.\n`);
  process.stdout.write(`Mutation checks: ${mutationsEnabled ? "enabled for verified disposable organisations" : "disabled"}.\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Live tenant security preflight failed."}\n`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", "tests/multi-organisation.integration.test.mjs"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
