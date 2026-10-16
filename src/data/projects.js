// Single source of truth for project content. Resume facts live in profile.js.
// Link policy: live URL when one exists; public repo link otherwise;
// private projects render "private, available on request" (no dead links).
// Copy rules: no em dashes, no eyebrow labels, no scroll cues, no live clocks.
//
// Each project has a case study: problem (what was broken), built (what was
// made), result (what it measured), plus up to three headline metrics.

import { contact, profile } from './profile.js';

export const projects = [
  {
    slug: 'receptionist-live',
    title: 'AI Voice Receptionist',
    year: '2025',
    status: 'archived',
    statusText: 'Archived',
    desc: 'A virtual agent that answers the phone, qualifies the caller, books the appointment and writes the result to the CRM.',
    problem: 'Inbound calls went to voicemail after hours and the leads went cold.',
    built:
      'Speech in, model, speech out, every hop streaming, inside a sub-2-second response budget. Audio under a 0.85 ASR confidence gate is re-asked instead of guessed at, and a caller can talk over it without noise triggering a false interrupt.',
    result: 'In its first 30 days live it handled 83 after-hours calls and booked 11 appointments.',
    metrics: [
      { value: '83', label: 'after-hours calls in 30 days' },
      { value: '11', label: 'appointments booked' },
      { value: '< 2 s', label: 'response budget' },
    ],
    stack: ['Twilio Media Streams', 'Deepgram', 'Azure TTS', 'Groq', 'Node.js', 'Docker', 'Supabase'],
    liveUrl: null,
    repoUrl: null,
    privateNote: 'Private, available on request',
    accent: '#34d17b',
  },
  {
    slug: 'crm-live',
    title: 'Self-Hosted CRM',
    year: '2025',
    status: 'archived',
    statusText: 'Archived',
    desc: 'Kanban pipelines, conversion funnels and a Call Room that prepares the rep before every dial.',
    problem: 'Call prep was improvised, so quality swung by rep and by lead.',
    built:
      'A Call Room that drafts the call script, voicemail script and likely objections for that specific lead, plus a classifier that reads inbound replies and hands anything it is unsure about to a person. Postgres row-level security keeps each tenant in its own lane.',
    result:
      'Under 10% of replies fall below the confidence threshold and go to a human, which is the guardrail that stops a generative system answering a customer it should not.',
    metrics: [
      { value: '< 10%', label: 'replies escalated to a person' },
      { value: 'RLS', label: 'Postgres row-level security' },
    ],
    stack: ['Node.js', 'Supabase', 'Postgres RLS', 'Docker', 'Caddy', 'Gemini', 'Groq'],
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
    statusText: 'Archived',
    desc: 'Two-axis lead scoring, fit and intent, built entirely from free public signals.',
    problem: "Lead qualification came down to one yes/no question about the prospect's website.",
    built:
      'A scoring model on two axes, fit and intent, fed by a 70K-domain daily newly-registered feed cross-matched against permit records, DNS, TLS and archive probes. Thresholds were tuned on measured conversion, and tiered output routes straight into the CRM with the evidence that scored it attached.',
    result:
      'The cold outbound funnel reports on itself: 27.2% open and 4.3% book across 233 sends on the initial production run.',
    metrics: [
      { value: '70K', label: 'domains per day scanned' },
      { value: '27.2%', label: 'open rate' },
      { value: '4.3%', label: 'book rate, 233 sends' },
    ],
    stack: ['Python', 'Node.js', 'Overpass API', 'Gemini 2.5 Flash', 'PostgreSQL', 'Cloudflare Workers', 'Docker'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/lead-engine-showcase',
    privateNote: null,
    accent: '#34d17b',
  },
  {
    slug: 'halo-agent-os',
    title: 'H.A.L.O Agent OS',
    year: '2025',
    status: 'paused',
    statusText: 'Paused',
    desc: 'An operating system for a one-person business, staffed by 27 agents in a four-layer hierarchy and connected over Model Context Protocol.',
    problem:
      'One person cannot run sales, ops, security and content at once, and unattended agents are only useful if they ask before they send, spend, publish, delete or sign.',
    built:
      "Intake turns six answers into departments, routines and templates. Routines run on the server in the owner's time zone and work is handed between agents on a shared board with persistent memory. A model router sends each task across Groq, Gemini on Vertex AI, Ollama and GPT-4o with automatic failover, and steps down a tier at the daily cap rather than failing.",
    result:
      '578 tokens of fixed per-turn overhead against 656 to 3,878 for three competing frameworks, and 14.3% of context saved losslessly where the nearest rival reached 10.8% only by discarding results.',
    metrics: [
      { value: '27', label: 'agents, four layers' },
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
    slug: 'agent-eval',
    title: 'Agent Evaluation Harness',
    year: '2026',
    status: 'live',
    statusText: 'Operational',
    desc: 'A statistical harness that measures whether an agent platform beats the alternatives, on benchmarks written by other people.',
    problem: 'Nobody could say whether the platform beat the alternatives, and our own numbers flattered us.',
    built:
      'An evaluation harness run on benchmark suites written outside the company, with endpoints fixed before each run, multiple-comparison correction, McNemar tests and bootstrap confidence intervals. Across roughly 47 hypothesis tests the estimator was pinned in advance.',
    result:
      'A solve rate of 75.0% against 50.0% for the closest open-source comparator (n=20), and a reliability profile to k=6 that fell 70.0% against 44.0%, isolating 22 points of accuracy as run-to-run variance. Six of my own findings were withdrawn after tracing them to a comparison that was never pinned down.',
    metrics: [
      { value: '75.0%', label: 'solve rate vs 50.0%' },
      { value: '70.0%', label: 'reliability at k=6 vs 44.0%' },
      { value: '6', label: 'own findings withdrawn' },
    ],
    stack: ['Python', 'Node.js', 'Vitest', 'McNemar', 'bootstrap CIs', 'pre-registration'],
    liveUrl: null,
    repoUrl: null,
    privateNote: 'Private, available on request',
    accent: '#2f80ff',
  },
  {
    slug: 'brainai',
    title: 'BrainAI Knowledge Graph',
    year: '2025',
    status: 'live',
    statusText: 'Operational',
    desc: 'A markdown knowledge base of 300+ wikilinked notes, indexed into Neo4j and exposed to Claude through a read-only MCP server.',
    problem:
      'Answers drawn from a 300+ note knowledge base could not be traced, so a retrieved fact and a guess looked identical.',
    built:
      'Embeddings and vector search with reranking, and every answer forced to cite the note it came from. Each sync reports orphan notes, dangling links and notes missing a level field. A live map lights each node as a tool call touches it.',
    result: 'Agents that cite their source note, over a graph that audits itself on every sync.',
    metrics: [
      { value: '300+', label: 'notes in the graph' },
      { value: '27', label: 'agents that read it over MCP' },
    ],
    stack: ['Node.js', 'Neo4j', 'Docker', 'MCP', 'D3.js', 'Markdown'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/brain-graph',
    privateNote: null,
    accent: '#2f80ff',
  },
  {
    slug: 'omni-sdr',
    title: 'Omni SDR',
    year: '2026',
    status: 'progress',
    statusText: 'Pre-launch',
    desc: 'The SDR between outreach and the closer: every reply sorted, every claim checked, and a human approving what goes out.',
    problem: 'AI sales tools are judged on how much they send, so they send a lot and make things up: a statistic the prospect never saw, a follow-up to a call that never happened.',
    built:
      'Replies are classified and sorted with a business-hours SLA. A claims gate blocks any sentence with a number, price or superlative that is not backed by evidence for that contact, and the final send check runs inside Postgres as the message row is inserted. A second model can only say stop, never send.',
    result: 'Pre-launch, with the backend running in production on Google Cloud. The public showcase repo shows the product; the source is private.',
    metrics: [],
    stack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Google Cloud', 'Gmail API'],
    liveUrl: 'https://omnisdr.com',
    repoUrl: 'https://github.com/DimeDataCloud/omni-sdr-showcase',
    privateNote: null,
    accent: '#e8a33d',
  },
  {
    slug: 'app-builder',
    title: 'App Builder',
    year: '2025',
    status: 'progress',
    statusText: 'In the lab',
    desc: 'An AI pipeline that takes a plain-language app idea to an execution-ready build specification.',
    problem: 'Ideas die between the sentence that describes them and the spec an engineer can build from.',
    built:
      'Concept lock, a 12-section blueprint, a clickable HTML preview, and a Playwright visual verification loop that checks the preview against the spec.',
    result: 'A repeatable path from idea to build-ready spec, public on GitHub.',
    metrics: [{ value: '12', label: 'blueprint sections' }],
    stack: ['Claude Code', 'Playwright', 'Node.js', 'HTML'],
    liveUrl: null,
    repoUrl: 'https://github.com/DimeDataCloud/app-builder',
    privateNote: null,
    accent: '#e8a33d',
  },
  {
    slug: 'portfolio-site',
    title: 'This Portfolio',
    year: '2026',
    status: 'live',
    statusText: 'Live',
    desc: 'An interactive 3D portfolio: every project is a procedural hologram, with a custom post-processing pass and synthesised sound.',
    problem: 'A list of links says nothing about how someone builds.',
    built:
      'Vite and Three.js from scratch. No models, textures or audio files: every scene is built from primitives, every sound is synthesised in Web Audio, and the real content lives in semantic HTML under the canvas for search engines and screen readers.',
    result: 'About 150 KB gzipped including Three.js, zero console errors across desktop, mobile and reduced-motion states.',
    metrics: [
      { value: '~150 KB', label: 'gzipped, incl. Three.js' },
      { value: '0', label: 'audio or model files' },
    ],
    stack: ['Three.js', 'Vite', 'GLSL', 'Web Audio API', 'Playwright', 'Cloudflare Workers'],
    liveUrl: 'https://portfolio.dimedata.cloud',
    repoUrl: 'https://github.com/DimeDataCloud/portfolio',
    privateNote: null,
    accent: '#2f80ff',
  },
];

export const socials = contact.links;

export const meta = {
  name: profile.name,
  title: profile.headline,
  email: contact.email,
  location: profile.location,
  bio: 'I build, measure and operate applied AI systems end to end, from voice agents and retrieval to the statistics that prove they work.',
};
