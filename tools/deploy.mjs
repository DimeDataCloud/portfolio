// Deploy to Cloudflare Workers (static assets). The custom domain is attached
// by the routes in wrangler.toml. Run `npm run build` first.
//
// Credentials come from the environment only, never from a file in this repo:
//   CLOUDFLARE_API_TOKEN   Workers + DNS edit token
//   CLOUDFLARE_ACCOUNT_ID  the account that owns the zone
// Nothing is written to disk or passed on the command line.
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment. See .env.example.');
  process.exit(1);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));

const r = spawnSync(process.execPath, [wrangler, 'deploy'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
