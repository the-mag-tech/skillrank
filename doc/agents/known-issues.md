# Known Issues — SkillRank

## Open Items

| Issue | Description | Workaround |
|-------|-------------|------------|
| (none yet) | Project is in scaffolding phase | — |

## Known Footguns

| Footgun | Trigger | Fix |
|---------|---------|-----|
| D1 local vs production | Schema drift between local SQLite and Railway Postgres | Always run migrations on both environments |
| Hub API rate limits | Crawling too frequently triggers rate limits | Respect `Retry-After` headers, use exponential backoff |
