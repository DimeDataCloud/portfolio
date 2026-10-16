// Deploy to Cloudflare Workers (static assets), with the custom domain
// attached via the routes in wrangler.toml.
//
// Credentials come from the environment:
//   CLOUDFLARE_API_TOKEN   Workers + DNS edit token
//   CLOUDFLARE_ACCOUNT_ID  the account that owns the zone
// Or point KEYS_FILE at a local markdown key file containing
// "| API Token | ... |" and "| Account ID | ... |" rows, kept outside the repo.
// Nothing is written to disk or passed on the command line.
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

const env = { ...process.env };

if (env.KEYS_FILE && (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)) {
  const md = readFileSync(env.KEYS_FILE, 'utf8');
  const field = (label) => md.match(new RegExp(`${label} \\| (\\S+)`))?.[1];
  env.CLOUDFLARE_API_TOKEN ||= field('API Token');
  env.CLOUDFLARE_ACCOUNT_ID ||= field('Account ID');
}

if (!env.CLOUDFLARE_API_TOKEN) {
  console.error('Set CLOUDFLARE_API_TOKEN (or KEYS_FILE). See .env.example.');
  process.exit(1);
}

const r = spawnSync('node', ['node_modules/wrangler/bin/wrangler.js', 'deploy'], {
  env, stdio: 'pipe', shell: false, encoding: 'utf8',
});
const out = (r.stdout || '') + (r.stderr || '');
console.log(out.slice(-1200));
process.exit(r.status ?? 1);
