# Architecture — SkillRank

## System Overview

SkillRank is a Cloudflare Worker that aggregates skill hub metadata,
computes PageRank-style quality scores for each hub, and exposes
a search/ranking API.

## Module Map

| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| `src/registry/` | Hub definitions, SDK adapters | `hubs.ts`, `adapters/` |
| `src/crawler/` | Scheduled crawl logic, data fetch | `scheduled.ts` |
| `src/ranker/` | PageRank computation, signal aggregation | `pagerank.ts` |
| `src/api/` | HTTP API routes (`/rank`, `/hubs`, `/search`) | `router.ts` |
| `src/db/` | D1 schema, migrations, queries | `schema.sql`, `queries.ts` |

## Data Flow

```
Cron Trigger (daily)
    │
    ▼
Crawler → for each Hub in Registry:
    │      invoke SDK package or fetch API
    │      collect: skill_count, last_updated, contributor_ids
    │
    ▼
D1 Database
    │  store raw hub snapshots
    │
    ▼
Ranker (on-demand or post-crawl)
    │  compute PageRank from hub graph
    │  aggregate quality signals
    │
    ▼
API → /rank: sorted hub list with scores
      /hubs: registry listing
      /search: skill search across all hubs
```

## Hub Graph Model

```
Hub A ──fork──→ Hub B
  │                │
  └─contributor──→ Hub C
                   │
                   └─sdk_ref──→ Hub A
```

Each edge type contributes a configurable weight to the PageRank matrix.
