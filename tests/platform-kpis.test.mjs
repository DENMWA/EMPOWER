import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root=process.cwd();
const source=(file)=>readFile(path.join(root,file),"utf8");

test("EmpowerNotes platform KPIs use explainable live metadata",async()=>{
  const[panel,dashboard]=await Promise.all([source("components/platform/PlatformKpiScorecard.tsx"),source("components/platform/PlatformDashboard.tsx")]);
  for(const label of ["Workspace activation","Paying account rate","Active product adoption","AI note adoption","Invoicing adoption","Payment collection","Support resolution","Accounts clear of payment risk"])assert.match(panel,new RegExp(label));
  assert.match(panel,/Select a metric to see exactly how it is calculated/);
  assert.match(panel,/Formula:/);
  assert.match(panel,/Internal benchmark/);
  assert.doesNotMatch(panel,/participantName|progressNote|diagnosis|incidentDetails/);
  assert.match(dashboard,/PlatformKpiScorecard organisations=\{data\.organisations\}/);
});
