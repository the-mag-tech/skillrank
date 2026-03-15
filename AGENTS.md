# AGENTS.md — SkillRank

## What is SkillRank

A PageRank-inspired ranking engine for AI Agent Skill Hubs.
Skill Hubs (ClawHub, SkillKit Marketplace, Cursor Marketplace, etc.) are the **Domains**.
Individual skills are **Metadata** under each Domain node.
The engine aggregates, scores, and ranks hubs — not individual skills.

SkillRank is a pure infrastructure service. It does NOT contain business logic,
UI, or platform-specific content. Those belong in downstream consumers
(e.g. Skillet, Prism Scout).

**Bidirectional feedback**: SkillRank receives semantic signals from Prism
(citation density, contributor reputation, content quality) via `POST /signal`.
V1 stores signals without using them in ranking; V2 integrates them into PageRank.
@decision skillet:002

## Mandatory Rules

1. **ADR governance**: Every architectural decision must be recorded in `doc/adr/`.
   ADRs are immutable once decided. To reverse a decision, create a new ADR that supersedes it.
2. **Auto-generated indexes**: Never hand-edit the index table between
   `<!-- INDEX:START -->` and `<!-- INDEX:END -->` markers in any README.md.
   Run `npx tsx scripts/generate-doc-index.ts all` after adding new docs.
3. **TDD methodology**: Write failing tests first, then implement, then refactor.
   Tests live in `tests/` directory, colocated by module.
4. **Zero-mock testing**: Test against real services where possible.
   Use D1 local bindings or Miniflare for Cloudflare Workers testing.
5. **DRY principle**: Every piece of knowledge has a single, authoritative representation.
6. **Discussion-first ADR flow**: Every ADR must include
   `> Discussion: [discussion log](xxx.discussion.md)`.
7. **Governance gate**: Before handoff/merge, run `pnpm doc:governance` and keep it passing.

## Architecture Overview

```text
┌──────────────────────────────────────────────────────┐
│  CF Worker — SkillRank Engine                        │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Registry │  │ Crawler  │  │ Ranker (PageRank) │   │
│  │ (Hubs)   │──│ (Fetch)  │──│ (Scoring)         │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│       │                             │                │
│  ┌──────────┐                  ┌─────────┐           │
│  │ D1 (SQL) │                  │ API     │           │
│  │ Railway  │                  │ /rank   │           │
│  └──────────┘                  │ /hubs   │           │
│                                │ /search │           │
│                                │ /signal │ ← Prism   │
│                                └─────────┘           │
└──────────────────────────────────────────────────────┘
```

- **Registry**: Hub definitions (name, API endpoint, SDK package, crawl config)
- **Crawler**: Scheduled worker that invokes hub SDKs to fetch skill counts, metadata
- **Ranker**: PageRank-like scoring based on hub quality signals
- **D1 / Railway Postgres**: Persistent storage for hub data and rank history

## Reference Sub-Documents

| Document | Path | When to read |
| --- | --- | --- |
| Architecture details | `doc/agents/architecture.md` | Deep-dive into module design, data flow |
| Known issues | `doc/agents/known-issues.md` | Debugging, workarounds, open items |
| DX Tooling | `doc/agents/dx-tooling.md` | Skills, commands, doc governance |

## Tech Stack

- **Runtime**: Cloudflare Workers (TypeScript)
- **Database**: D1 (SQLite) for development, Railway Postgres for production
- **Package Manager**: pnpm
- **Testing**: Vitest + Miniflare
- **Docs**: ADR + Pitfall + Auto-generated indexes

## Build & Dev

```bash
pnpm install                    # Install dependencies
pnpm dev                        # Local dev (wrangler dev)
pnpm test                       # Run tests (vitest)
pnpm deploy                     # Deploy to CF Workers
npx tsx scripts/generate-doc-index.ts all  # Regenerate doc indexes
pnpm doc:check                  # Validate ADR metadata + discussion links + index markers
pnpm doc:governance             # gen:index + doc:check
```
