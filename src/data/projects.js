// Single source of truth for project content. Resume facts live in profile.js.
// Link policy: live URL when one exists; public repo link otherwise;
// private projects render "private, available on request" (no dead links).
// Copy rules: no em dashes, no eyebrow labels, no scroll cues, no live clocks.
// Number policy (tools/content-rules.mjs enforces it): no small counts used as
// evidence in copy or metric chips. Large figures, percentages, thresholds and
// time budgets stay.
//
// Each project has a case study: problem (what was broken), built (what was
// made), result (what it measured), plus up to three headline metrics.
// `theme` tags the project for filtering (next PR). Allowed ids are listed in
// THEMES in tools/content-rules.mjs.

import { connections, contact, profile } from './profile.js';

export const projects = [
  {
    slug: 'omni-sdr',
    title: 'Omni SDR',
    year: '2026',
    status: 'progress',
    statusText: 'Pre-launch',
    theme: ['sales', 'llm'],
    related: ['crm-live', 'leadgen-live', 'halo-agent-os'],
    patterns: ['approval'],
    desc: 'The SDR between outreach and the closer: every reply sorted, every claim checked, and a human approving what goes out.',
    problem: 'AI sales tools are judged on how much they send, so they send a lot and make things up: a statistic the prospect never saw, a follow-up to a call that never happened.',
    built:
      'Replies are classified and sorted with a business-hours SLA. A claims gate blocks any sentence with a number, price or superlative that is not backed by evidence for that contact. The send is guarded in the database: gate passed, same tenant, not suppressed and the daily cap are checked inside the same transaction that writes the message. A second model can only say stop, never send.',
    result: 'Pre-launch, with the backend running in production on Google Cloud. The test suite runs 283 tests. The public showcase repo shows the product; the source is private.',
    metrics: [],
    stack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Google Cloud', 'Gmail API'],
    liveUrl: 'https://omnisdr.com',
    repoUrl: 'https://github.com/DimeDataCloud/omni-sdr-showcase',
    privateNote: null,
    accent: '#e8a33d',
  },
  {
    slug: 'halo-agent-os',
    title: 'H.A.L.O Agent OS',
    year: '2025',
    status: 'paused',
    statusText: 'Paused, case study',
    theme: ['assist', 'llm', 'infra'],
    related: ['brainai', 'agent-eval', 'lobby', 'claude-modder', 'open-waddle'],
    patterns: ['mcp'],
    desc: 'An operating system for a one-person business, staffed by 27 agents in a four-layer hierarchy and connected over Model Context Protocol.',
    problem:
      'One person cannot run sales, ops, security and content at once, and unattended agents are only useful if they ask before they send, spend, publish, delete or sign.',
    built:
      "Intake turns a short set of answers into departments, routines and templates. Routines run on the server in the owner's time zone and work is handed between agents on a shared board with persistent memory. Each account runs in its own process, and 3,567 tests cover the public showcase repo. A model router sends each task across Groq, Gemini on Vertex AI, Ollama and GPT-4o with automatic failover, and steps down a tier at the daily cap rather than failing.",
    result:
      '578 tokens of fixed per-turn overhead against 656 to 3,878 for three competing frameworks, and 14.3% of context saved losslessly where the nearest rival reached 10.8% only by discarding results.',
    metrics: [
      { value: '578', label: 'tokens fixed overhead per turn' },
      { value: '14.3%', label: 'context saved losslessly' },
    ],
    stack: ['TypeScript', 'React', 'Node.js', 'Electron', 'Docker', 'Caddy', 'MCP'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/halo-agent-showcase',
    privateNote: null,
    accent: '#34d17b',
  },
  {
    slug: 'receptionist-live',
    title: 'AI Voice Receptionist',
    year: '2025',
    status: 'archived',
    statusText: 'Archived, case study',
    theme: ['voice', 'assist'],
    related: ['crm-live', 'halo-agent-os'],
    desc: 'A virtual agent that answers the phone, qualifies the caller, books the appointment and writes the result to the CRM.',
    problem: 'Inbound calls went to voicemail after hours and the leads went cold.',
    built:
      'Speech in, model, speech out, every hop streaming, inside a sub-2-second response budget. Audio under a 0.85 ASR confidence gate is re-asked instead of guessed at, and a caller can talk over it without noise triggering a false interrupt.',
    result: 'Answered after-hours calls end to end: the caller is qualified, the appointment is booked and the result is written to the CRM without a person on the line.',
    metrics: [
      { value: '< 2 s', label: 'response budget, speech in to speech out' },
      { value: '~120 ms', label: 'time-to-first-token target' },
      { value: '0.85', label: 'ASR confidence gate' },
    ],
    stack: ['Twilio Media Streams', 'Deepgram', 'Azure TTS', 'Groq', 'Node.js', 'Docker', 'Supabase'],
    liveUrl: null,
    repoUrl: null,
    privateNote: 'Private, available on request',
    accent: '#34d17b',
  },
  {
    slug: 'agent-eval',
    title: 'Agent Evaluation Harness',
    year: '2026',
    status: 'live',
    statusText: 'Operational',
    theme: ['eval', 'data'],
    related: ['halo-agent-os', 'brainai', 'trading-bot'],
    desc: 'A statistical harness that measures whether an agent platform beats the alternatives, on benchmarks written by other people.',
    problem: 'Nobody could say whether the platform beat the alternatives, and our own numbers flattered us.',
    built:
      'An evaluation harness run on benchmark suites written outside the company, with endpoints fixed before each run, multiple-comparison correction, McNemar tests and bootstrap confidence intervals. Across about 47 hypothesis tests the estimator was pinned in advance.',
    result:
      'A reliability profile of 70.0% vs 44.0%, with the run-to-run variance isolated as a separate measured quantity. Several of my own findings were withdrawn after tracing them to a comparison that was never pinned down.',
    metrics: [
      { value: '~47', label: 'hypothesis tests' },
      { value: '578 vs 656 to 3,878', label: 'fixed per-turn token overhead' },
      { value: '14.3%', label: 'context saved losslessly' },
    ],
    stack: ['Python', 'Node.js', 'Vitest', 'McNemar', 'bootstrap CIs', 'pre-registration'],
    liveUrl: null,
    repoUrl: null,
    privateNote: 'Private, available on request',
    accent: '#2f80ff',
  },
  {
    slug: 'open-claudeos',
    title: 'Open ClaudeOS',
    year: '2026',
    status: 'progress',
    statusText: 'Open source',
    theme: ['assist', 'llm'],
    related: ['open-waddle', 'claude-modder'],
    patterns: ['approval'],
    desc: 'Claude proposes, deterministic code decides, and the user approves a card before anything runs.',
    problem: "Approval dialogs ask people to trust the model's description of an action, which is the wrong thing to approve.",
    built:
      'Each proposal is a list of typed actions, and the approval card is generated from those actions rather than from the model\'s prose. An on-device router answers the questions it is confident about. C# on .NET 10 with WinUI 3.',
    result: 'Every answer the on-device router gave at 80% or more confidence was correct. The repo carries 434 tests.',
    metrics: [
      { value: '434', label: 'tests in the open repo' },
    ],
    stack: ['C#', '.NET 10', 'WinUI 3'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/open-ClaudeOS',
    privateNote: null,
    accent: '#e8a33d',
  },
  {
    slug: 'brainai',
    title: 'BrainAI Knowledge Graph',
    year: '2025',
    status: 'live',
    statusText: 'Operational',
    theme: ['retrieval', 'data', 'viz'],
    related: ['halo-agent-os', 'lobby', 'agent-eval'],
    patterns: ['mcp'],
    desc: 'A markdown knowledge base of 300+ wikilinked notes, indexed into Neo4j and exposed to Claude through a read-only MCP server.',
    problem:
      'Answers drawn from a 300+ note knowledge base could not be traced, so a retrieved fact and a guess looked identical.',
    built:
      'Embeddings and vector search with reranking, and every answer forced to cite the note it came from. Every Cypher statement is checked for write clauses and run read-only. Each sync reports orphan notes, dangling links and notes missing a level field. A live map lights each node as a tool call touches it.',
    result: 'Agents that cite their source note, over a graph that audits itself on every sync.',
    metrics: [
      { value: '300+', label: 'notes in the graph' },
    ],
    stack: ['Node.js', 'Neo4j', 'Docker', 'MCP', 'D3.js', 'Markdown'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/brain-graph',
    privateNote: null,
    accent: '#2f80ff',
  },
  {
    slug: 'crm-live',
    title: 'Self-Hosted CRM',
    year: '2025',
    status: 'archived',
    statusText: 'Archived, case study',
    theme: ['sales', 'infra', 'data'],
    related: ['leadgen-live', 'omni-sdr'],
    patterns: ['mcp'],
    desc: 'Kanban pipelines, conversion funnels and a Call Room that prepares the rep before every dial.',
    problem: 'Call prep was improvised, so quality swung by rep and by lead.',
    built:
      'A Call Room that drafts the call script, voicemail script and likely objections for that specific lead, plus a classifier that reads inbound replies and hands anything it is unsure about to a person. Postgres row-level security keeps each tenant in its own lane. The MCP server uses OAuth 2.1 with PKCE and rotating refresh tokens, and each MCP tool runs as the caller\'s own token. It exposes a set of tools, most of them read-only, and no delete tool.',
    result:
      'Under 10% of replies fall below the confidence threshold and go to a human, which is the guardrail that stops a generative system answering a customer it should not.',
    metrics: [
      { value: '< 10%', label: 'replies escalated to a person' },
      { value: 'RLS', label: 'Postgres row-level security' },
    ],
    stack: ['Node.js', 'Supabase', 'Postgres RLS', 'Docker', 'Caddy', 'Gemini', 'Groq', 'OAuth 2.1'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/crm-showcase',
    privateNote: null,
    accent: '#34d17b',
  },
  {
    slug: 'leadgen-live',
    title: 'Lead-Generation Engine',
    year: '2025',
    status: 'archived',
    statusText: 'Archived, case study',
    theme: ['sales', 'data'],
    related: ['crm-live'],
    desc: 'Two-axis lead scoring, fit and intent, built entirely from free public signals.',
    problem: "Lead qualification came down to one yes/no question about the prospect's website.",
    built:
      'A scoring model on two axes, fit and intent, fed by a 70K-domain daily newly-registered feed cross-matched against permit records, DNS, TLS and archive probes. Thresholds were tuned on measured conversion, and the FIT score is capped by the evidence behind it. Tiered output routes straight into the CRM with the evidence that scored it attached.',
    result:
      'The lead-engine-showcase repo carries 231 enterprise tests for the scoring pipeline.',
    metrics: [
      { value: '70K', label: 'domains per day scanned' },
      { value: '231', label: 'enterprise tests in the lead-engine-showcase repo' },
      { value: 'FIT', label: 'score capped by the evidence behind it' },
    ],
    stack: ['Python', 'Node.js', 'Overpass API', 'Gemini 2.5 Flash', 'PostgreSQL', 'Cloudflare Workers', 'Docker'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/lead-engine-showcase',
    privateNote: null,
    accent: '#34d17b',
  },
  {
    slug: 'lobby',
    title: 'Lobby',
    year: '2026',
    status: 'progress',
    statusText: 'Open source',
    theme: ['infra', 'viz'],
    related: ['claude-modder', 'halo-agent-os'],
    patterns: ['mcp'],
    desc: 'A shared canvas where humans and AI agents post artifacts side by side.',
    problem: 'Artifacts made by people and by agents need one shared place where authorship is clear.',
    built:
      'Bot tokens are scoped to one workspace, and authorship is taken from the token, so an agent cannot post under someone else\'s name. The relay redacts secrets at the network boundary. Bun, TypeScript, SQLite, WebSocket and Vue 3.',
    result: 'Public under the MIT license.',
    metrics: [],
    stack: ['Bun', 'TypeScript', 'SQLite', 'WebSocket', 'Vue 3'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/lobby',
    privateNote: null,
    accent: '#2f80ff',
  },
  {
    slug: 'claude-modder',
    title: 'Claude Modder',
    year: '2026',
    status: 'progress',
    statusText: 'Open source',
    theme: ['infra', 'assist'],
    patterns: ['approval'],
    desc: 'A fleet orchestrator for Claude Code sessions with a permission gate that learns from outcomes.',
    problem: 'Running many Claude Code sessions at once means answering the same permission prompts again and again.',
    built:
      'A learning permission gate that refits its thresholds from outcomes. It may never get a known outcome wrong, and that is property tested over many random histories rather than assumed.',
    result: 'The gate is tested against its safety property rather than assumed, with its test suite in the public repo.',
    metrics: [],
    stack: ['Claude Code', 'Fleet orchestration'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/claude-modder',
    privateNote: null,
    accent: '#e8a33d',
  },
  {
    slug: 'open-waddle',
    title: 'Open Waddle',
    year: '2026',
    status: 'progress',
    statusText: 'Open source',
    theme: ['assist'],
    patterns: ['approval', 'tamper'],
    desc: 'A desktop AI agent drawn as a pixel-art duck that asks before it acts.',
    problem: 'A desktop agent with broad access is only safe if its permissions are decided in code and its record cannot be quietly edited.',
    built:
      'Four deterministic permission tiers, with approval only from a UI click and never from the model. The activity log is append-only and hash-chained, so an edited entry breaks the chain. Rust, Tauri 2 and TypeScript.',
    result: 'Permissions are decided by code, approvals come from a human click, and the activity log shows any edit made after the fact.',
    metrics: [],
    stack: ['Rust', 'Tauri 2', 'TypeScript'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/Open-Waddle',
    privateNote: null,
    accent: '#2f80ff',
  },
  {
    slug: 'jamlink',
    title: 'Jamlink',
    year: '2026',
    status: 'progress',
    statusText: 'Open source',
    theme: ['voice', 'infra'],
    related: ['receptionist-live'],
    desc: 'Browser-only two-player guitar jamming over WebRTC.',
    problem: 'Remote guitar jamming falls apart when latency and jitter go past what two players can play through.',
    built:
      'Raw 16-bit PCM goes over an unordered, no-retransmit WebRTC DataChannel, with its own jitter buffer. The 60 ms latency budget is enforced and shown on a live HUD. Cloudflare Workers and Durable Objects are the backend.',
    result: 'Latency is measured against the 60 ms budget on screen while the two players play.',
    metrics: [{ value: '60 ms', label: 'enforced latency budget, shown live' }],
    stack: ['WebRTC', 'DataChannel', 'Cloudflare Workers', 'Durable Objects'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/jamlink',
    privateNote: null,
    accent: '#34d17b',
  },
  {
    slug: 'trading-bot',
    title: 'Trading Bot',
    year: '2026',
    status: 'progress',
    statusText: 'Paper trading only',
    theme: ['data', 'eval'],
    related: ['agent-eval', 'open-waddle'],
    patterns: ['tamper'],
    desc: 'A paper-only research desk where every experiment is pre-registered with pass and fail gates.',
    problem: 'A strategy looks good in hindsight unless the test and its pass criteria are fixed before the data is seen.',
    built:
      'Experiments are pre-registered with pass and fail gates. Every decision goes to a hash-chained audit log, and the desk verify command checks that the chain is intact. Python.',
    result: 'Results are read against gates that were set in advance. Not financial advice.',
    metrics: [],
    stack: ['Python'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/trading-bot',
    privateNote: null,
    accent: '#e8a33d',
  },
  {
    slug: 'portfolio-site',
    title: 'This Portfolio',
    year: '2026',
    status: 'live',
    statusText: 'Live',
    theme: ['viz', 'infra'],
    related: [],
    desc: 'An interactive 3D portfolio: every project is a procedural hologram, with a custom post-processing pass and synthesised sound.',
    problem: 'A list of links says nothing about how someone builds.',
    built:
      'Vite and Three.js from scratch. No models, textures or audio files: every scene is built from primitives, every sound is synthesised in Web Audio, and the real content lives in semantic HTML under the canvas for search engines and screen readers.',
    result: 'About 150 KB gzipped including Three.js, zero console errors across desktop, mobile and reduced-motion states.',
    metrics: [{ value: '~150 KB', label: 'gzipped, incl. Three.js' }],
    stack: ['Three.js', 'Vite', 'GLSL', 'Web Audio API', 'Playwright', 'Cloudflare Workers'],
    liveUrl: 'https://portfolio.dimedata.cloud',
    repoUrl: 'https://github.com/DimeDataCloud/portfolio',
    privateNote: null,
    accent: '#2f80ff',
  },
];

// Relations: each project declares `related` slugs (tools/content-rules.mjs
// checks they exist). Here the reverse link is derived, so A lists B and B
// lists A. Each list follows the order of `projects`.
const declaredOut = new Map(projects.map((p) => [p.slug, new Set(p.related ?? [])]));
for (const p of projects) {
  for (const slug of p.related ?? []) declaredOut.get(slug)?.add(p.slug);
}
export const relatedSlugs = Object.fromEntries(
  projects.map((p) => [
    p.slug,
    projects.map((q) => q.slug).filter((slug) => slug !== p.slug && declaredOut.get(p.slug).has(slug)),
  ]),
);

// Patterns several projects share. A project lists the ids it uses in `patterns`.
export const patternDefs = [
  {
    id: 'approval',
    title: 'Human approval before anything irreversible',
    line: 'The model proposes, deterministic code checks, and a person approves before anything is sent, changed or run.',
  },
  {
    id: 'tamper',
    title: 'Tamper-evident logs',
    line: 'Each entry is chained to the one before it, so an edited entry breaks the chain and the edit shows.',
  },
  {
    id: 'mcp',
    title: 'Model Context Protocol as the seam',
    line: 'Agents and tools meet at one interface, Model Context Protocol, instead of custom glue for each pair.',
  },
];

export const sharedPatterns = patternDefs.map((d) => ({
  ...d,
  projects: projects.filter((p) => p.patterns?.includes(d.id)).map((p) => p.slug),
}));

export const socials = contact.links;

// Each connection from profile.js with the slugs of the projects whose `theme`
// includes its id, in projects order. Derived here (not in profile.js) so the
// links cannot drift from the theme arrays and profile.js never imports projects.
export const linkedConnections = connections.map((c) => ({
  ...c,
  projects: projects.filter((p) => p.theme?.includes(c.id)).map((p) => p.slug),
}));

export const meta = {
  name: profile.name,
  title: profile.headline,
  email: contact.email,
  location: profile.location,
  bio: 'I build, measure and operate applied AI systems end to end, from voice agents and retrieval to the statistics that prove they work.',
};
