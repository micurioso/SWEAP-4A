import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { rowToMember } from "../lib/csv";
import { importMembers } from "../lib/import";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const csvPath = path.resolve(process.cwd(), "data.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`data.csv not found at ${csvPath}`);
    process.exit(1);
  }
  const csv = fs.readFileSync(csvPath, "utf8");

  const { data } = Papa.parse<string[]>(csv, { skipEmptyLines: true });
  // Skip header row
  const rows = data.slice(1);
  const members = [];
  let skipped = 0;
  for (const row of rows) {
    const m = rowToMember(row);
    if (m) members.push(m);
    else skipped++;
  }
  console.log(`Parsed ${members.length} members (skipped ${skipped}). Importing…`);

  const result = await importMembers(supabase as any, members, "overwrite");
  console.log("Done:", result);
}

main().catch(err => { console.error(err); process.exit(1); });
