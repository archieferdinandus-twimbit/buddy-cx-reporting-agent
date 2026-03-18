import * as path from "path";
import * as fs from "fs";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const value = trimmed.slice(eqIdx + 1);
  process.env[key] = value;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sql = `
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'draft', 'complete')),
  sections JSONB DEFAULT '{}'::jsonb,
  tagged_insights JSONB DEFAULT '[]'::jsonb,
  chat_history JSONB DEFAULT '[]'::jsonb,
  canvas_cards JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_updated ON reports(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_dataset ON reports(dataset_id);
`;

async function run() {
  const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
  const url = "https://" + projectRef + ".supabase.co/pg/query";

  console.log("Running migration against:", SUPABASE_URL);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log("Migration successful!", await res.json());
  } else {
    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response:", text.slice(0, 500));
    console.log("\n--- Run this SQL in the Supabase Dashboard SQL Editor ---\n");
    console.log(sql);
  }
}

run().catch(console.error);
