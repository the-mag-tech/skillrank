# Contributing to SkillRank

## Quick Start

```bash
# 1. Clone
git clone https://github.com/the-mag-tech/skillrank.git
cd skillrank

# 2. Install dependencies
pnpm install

# 3. Local dev (Wrangler + D1 local)
pnpm dev

# 4. Run tests
pnpm test
```

## Prerequisites

- Node.js 22+
- pnpm 9+
- Wrangler CLI (`pnpm add -g wrangler`)
- Cloudflare account (for deployment only; local dev uses Miniflare)

## Tech Stack

| Tool | Purpose |
|------|---------|
| **Cloudflare Workers** | Runtime (TypeScript) |
| **D1** | SQLite database (local for dev, remote for prod) |
| **Miniflare** | Local Workers simulator for testing |
| **Vitest** | Test framework |
| **pnpm** | Package manager |

## Project Structure

```
skillrank/
├── src/
│   ├── index.ts          # Worker entry point (fetch handler)
│   ├── registry/         # Hub definitions + CRUD
│   ├── crawler/          # Scheduled hub data fetcher
│   ├── ranker/           # PageRank scoring engine
│   └── api/              # Route handlers (/rank, /hubs, /search, /signal)
├── tests/                # Vitest tests (mirror src/ structure)
├── migrations/           # D1 SQL migrations
├── doc/adr/              # Architecture Decision Records
├── doc/pitfall/          # Known issues + lessons
├── scripts/              # Dev tooling
├── wrangler.toml         # CF Workers config
└── AGENTS.md             # Mandatory rules for all contributors
```

## Development Workflow

### TDD (mandatory)

```
1. Write failing test
2. Implement minimal code to pass
3. Refactor
4. Repeat
```

See `AGENTS.md` for full TDD rules.

### D1 Local Development

```bash
# Create local D1 database
wrangler d1 create skillrank-db --local

# Run migrations
wrangler d1 migrations apply skillrank-db --local

# Start dev server
pnpm dev
```

### Testing with Miniflare

Tests run against a real local D1 instance via Miniflare — no mocks.

```bash
pnpm test              # Run all tests
pnpm test -- --watch   # Watch mode
```

### Doc Indexes

After adding new ADRs or Pitfalls:

```bash
pnpm gen:index    # or: npx tsx scripts/generate-doc-index.ts all
```

Never hand-edit between `<!-- INDEX:START -->` and `<!-- INDEX:END -->` markers.

## Key ADRs to Read First

1. **[ADR-001](doc/adr/001-hub-as-domain-pagerank-model.md)** — Core ranking model
2. `@decision skillet:002` — Bidirectional contract with Prism

## API Endpoints to Implement

See [API Spec](doc/api-spec.md) for full request/response schemas.

| Endpoint | Method | Priority | Description |
|----------|--------|----------|-------------|
| `/hubs` | GET | P0 | List all registered hubs |
| `/hubs` | POST | P0 | Register a new hub |
| `/rank` | GET | P1 | Get hub quality scores |
| `/search` | GET | P1 | Search skills across hubs |
| `/signal` | POST | P2 | Receive feedback signals from Prism |

## Commit Convention

- Action-oriented: `Add hub CRUD endpoints`
- Prefix by area: `API: add /rank endpoint`, `DB: add signal table migration`
- One logical change per commit
