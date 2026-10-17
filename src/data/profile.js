// Profile content: the résumé, as data. Every number here comes from
// Christian's AI/ML résumé or from a public repo; nothing is rounded up.
// Style rules for any copy added here: no em dashes, no eyebrow labels,
// no scroll cues, no live clocks.

export const profile = {
  name: 'Christian Dixon',
  headline: 'Applied AI & Machine Learning Engineer',
  // One-sentence value proposition shown on the first screen, under the identity line.
  valueProp: 'Voice agents, retrieval, and the statistics that prove they work.',
  location: 'Nashville, TN',
  summary:
    'I build, measure and operate applied machine learning and generative AI systems end to end: the discovery that finds which process is worth automating, the engineering that takes it from prototype to production, and the statistical evaluation that proves whether it worked.',
  running:
    'Systems I have built and operated: real-time virtual agents on voice and messaging inside a sub-2-second response budget, LLM routing across four providers with fallback, retrieval with enforced citations, and a 27-agent hierarchy. Numbers on this site are self-reported from my own production logs and evaluation runs; private projects are available to walk through on request.',
};

// Headline numbers, shown as a strip on the About panel.
export const metrics = [
  { value: '3,567', label: 'passing tests in the public H.A.L.O showcase repo (measured 2026-09-10)' },
  { value: '70K', label: 'domains scanned per day by the lead engine' },
  { value: '300+', label: 'notes in the cited knowledge graph' },
];

// How the work fits together. `id` is a theme id from THEMES (tools/content-rules.mjs).
// The projects for each connection are derived from projects.js (`theme` arrays),
// so this list never names a project directly and cannot drift from it.
export const connections = [
  { id: 'voice', title: 'Virtual agents and voice', line: 'Speech in, model, speech out, every hop streaming, with a sub-2-second budget and a confidence gate that re-asks instead of guessing.' },
  { id: 'assist', title: 'Agent assist and messaging', line: 'Tools that prepare the human before the conversation, and hand anything uncertain to a person.' },
  { id: 'llm', title: 'LLMs, routing and cost', line: 'Four providers behind one interface with failover, each task sent to the cheapest model that is good enough.' },
  { id: 'retrieval', title: 'Retrieval and agents', line: 'Embeddings, search and reranking under agents that must cite the note an answer came from, connected over Model Context Protocol.' },
  { id: 'eval', title: 'Measurement and evaluation', line: 'Endpoints fixed before the run, multiple-comparison correction, and findings withdrawn when the statistics stop supporting them.' },
  { id: 'data', title: 'Data pipelines and modeling', line: 'Scheduled ingestion into scoring models built from free public signals.' },
  { id: 'infra', title: 'Infrastructure and security', line: 'Separate networks, a reverse proxy as the only way in, database-enforced rules, least-privilege access.' },
  { id: 'viz', title: 'Visualization and observability', line: 'Live maps and readable traces that turn a running agent from a black box into steps and costs.' },
  { id: 'sales', title: 'Sales and CRM systems', line: 'Discovery to close, built into the tools: CRMs, lead scoring and approval-gated outreach.' },
];

export const experience = [
  {
    role: 'AI Solutions Engineer',
    org: 'Dime Data',
    place: 'Remote',
    blurb: 'Sole engineer. Built and operate every system on this site.',
    points: [
      'Voice agent that answers the phone, qualifies the caller, books the appointment and writes the result to the CRM. Streaming at every hop, inside a sub-2-second budget, with a ~120 ms time-to-first-token target. Audio under a 0.85 ASR confidence gate is re-asked, not guessed.',
      'No outages or incidents across every deployment, shipped through CI/CD behind 3,000+ automated tests.',
      'Call Room and reply classifier that prepare the human before the conversation. Under 10% of replies fall below the confidence threshold and go to a person.',
      'Model router across Groq, Gemini on Vertex AI, Ollama and GPT-4o with automatic failover. Measured, not claimed: 578 tokens of fixed per-turn overhead against 656 to 3,878 for three competing frameworks, and 14.3% of context saved losslessly.',
      'Retrieval layer over a 300+ note knowledge base: embeddings, vector search, reranking, and every answer forced to cite its source note. 27 agents run on top of it over Model Context Protocol.',
      'Evaluation harness run on benchmark suites written outside the company, with endpoints fixed before each run. About 47 hypothesis tests, multiple-comparison correction, estimator fixed in advance.',
      'Two-axis lead scoring (fit and intent) from free public signals, including a 70K-domain daily newly-registered feed that feeds a cold outbound funnel.',
    ],
  },
  {
    role: 'Full-Cycle Account Executive',
    org: 'Cape Reserve (AT&T / T-Mobile)',
    place: 'Nashville, TN',
    blurb: 'Full-cycle outbound for a cold T-Mobile Fiber pilot market, then the AT&T book.',
    points: [
      'Number one rep in the pilot market in its first week.',
      'Consistent top-five ranking in a 26-person office on the AT&T book. Ran the weekly objection-handling training and built the library that I later automated for each lead.',
    ],
  },
  {
    role: 'Research and Development Specialist',
    org: 'Ledger Plus',
    place: 'Remote',
    blurb: 'Replaced manual market research with an AI and Python tool.',
    points: [
      'Scheduled API collection, transformation, statistical analysis and visualization, scoring token legitimacy across Solana perpetuals and memecoins. Saves about 180 seconds of research per token and supported desks that acquired over $500,000 in trading revenue.',
      'Built and ran the employee process-documentation portal for a non-technical audience, growing it to a peak of 200+ active members. The same stack became the CRM.',
    ],
  },
];

// Skill groups mirror the résumé. `items` render as small tags.
export const skills = [
  {
    group: 'Virtual agents and voice',
    items: ['Twilio Media Streams', 'Deepgram STT', 'Azure TTS', 'streaming inference', 'latency budgeting', 'escalation to human'],
  },
  {
    group: 'LLMs and routing',
    items: ['Claude', 'GPT-4o', 'Gemini on Vertex AI', 'Groq', 'Ollama', 'prompt engineering', 'structured output', 'tool calling', 'provider failover'],
  },
  {
    group: 'Retrieval and agents',
    items: ['embeddings', 'vector search', 'RAG with reranking', 'text classification', 'structured extraction', 'Model Context Protocol', 'multi-agent orchestration', 'Neo4j'],
  },
  {
    group: 'Data and modeling',
    items: ['Python', 'feature engineering', 'predictive modeling', 'BigQuery ML', 'PostgreSQL', 'SQLite', 'data pipelines'],
  },
  {
    group: 'Measurement',
    items: ['hypothesis testing', 'McNemar and bootstrap CIs', 'power analysis', 'pre-registration', 'multiple-comparison correction', 'conversion funnels', 'Vitest'],
  },
  {
    group: 'Infrastructure and security',
    items: ['Docker Compose', 'Caddy', 'Cloudflare Workers and Tunnel', 'Linux VPS hardening', 'key-only SSH', 'Postgres RLS', 'least-privilege IAM', 'secret scanning', 'GitHub Actions'],
  },
  {
    group: 'Languages and web',
    items: ['Python', 'TypeScript', 'JavaScript', 'Go', 'SQL', 'Bash', 'PowerShell', 'Node.js', 'React', 'Vite', 'Three.js', 'D3.js', 'Playwright'],
  },
];

export const education = [
  'Professional Machine Learning Engineer, Google Cloud Skills Boost',
  'Google AI Professional Certificate, Google / Coursera',
  'Business Process Analysis & Management, Coursera',
];

export const contact = {
  email: 'chris@dimedata.cloud',
  links: [
    { name: 'GitHub', url: 'https://github.com/DimeDataCloud', icon: 'github' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/christian-s-dixon', icon: 'linkedin' },
  ],
};
