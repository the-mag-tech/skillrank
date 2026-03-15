# SkillRank

A PageRank-inspired ranking engine for AI Agent Skill Hubs.

## Concept

The AI agent skill ecosystem is fragmented across many hubs — ClawHub, SkillKit Marketplace, Cursor Marketplace, and more. SkillRank treats **Hubs as Domains** and computes quality scores using PageRank-like algorithms, helping consumers discover which hubs are most reliable and well-maintained.

**Key insight**: Skills are ephemeral metadata. Hubs are durable infrastructure. Rank the infrastructure, not the content.

SkillRank is a pure infrastructure service — no UI, no business logic. Downstream consumers (e.g. [Skillet](https://github.com/ERerGB/skillet), Prism Scout) query its API.

## Architecture

```
CF Worker (SkillRank Engine)
├── Registry   — Hub definitions + SDK adapters
├── Crawler    — Scheduled fetch via hub SDKs (not API scraping)
├── Ranker     — PageRank scoring from hub graph signals
├── D1/Postgres — Hub snapshots + rank history
└── API        — /rank, /hubs, /search endpoints
```

## Status

**Scaffolding phase** — engineering governance established, implementation pending.

See [ADR-001](doc/adr/001-hub-as-domain-pagerank-model.md) for the foundational architecture decision.

## Development

```bash
pnpm install
pnpm dev                        # wrangler dev
pnpm test                       # vitest
npx tsx scripts/generate-doc-index.ts all  # regenerate doc indexes
```

## Engineering Governance

- **ADRs**: `doc/adr/` — immutable architectural decisions
- **Pitfalls**: `doc/pitfall/` — bugs, gotchas, lessons learned
- **AGENTS.md**: mandatory rules for AI agents and human developers
- **Auto-indexed docs**: `<!-- INDEX:START/END -->` markers, never hand-edit

## License

MIT
