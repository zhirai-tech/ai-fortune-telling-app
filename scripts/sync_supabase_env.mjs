import fs from 'node:fs/promises';
import path from 'node:path';

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const idx = s.indexOf('=');
    if (idx === -1) continue;
    const key = s.slice(0, idx).trim();
    const val = s.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

async function main() {
  const repoRoot = process.cwd();
  const supaEnvPath = path.resolve(repoRoot, 'infra/supabase/.env');
  const envText = await fs.readFile(supaEnvPath, 'utf8');
  const env = parseEnv(envText);

  const anonKey = env.ANON_KEY;
  if (!anonKey || anonKey === 'change-me') {
    throw new Error('ANON_KEY missing in infra/supabase/.env (run generate-keys.sh --update-env)');
  }

  const supabaseUrl = env.API_EXTERNAL_URL || env.SUPABASE_PUBLIC_URL || `http://localhost:${env.KONG_HTTP_PORT || '54321'}`;

  const out = `VITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\n`;
  await fs.writeFile(path.resolve(repoRoot, '.env.local'), out, 'utf8');
  console.log('wrote .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

main().catch((e) => {
  console.error(e?.message ?? String(e));
  process.exit(1);
});

