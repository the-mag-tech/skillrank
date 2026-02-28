# Architecture Decision Records

This directory contains all ADRs for SkillRank.

ADRs are immutable once decided. To reverse or modify a decision,
create a new ADR that supersedes the original.

## Index

<!-- INDEX:START -->
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 001 | [Hub-as-Domain PageRank Model](001-hub-as-domain-pagerank-model.md) | Proposed | 2026-02-28 |
<!-- INDEX:END -->

## Template

To create a new ADR:

1. Copy the template below into a new file: `NNN-slug.md`
2. Fill in the sections
3. Run `npx tsx scripts/generate-doc-index.ts adr` to update this index

```markdown
# ADR-NNN: Title

Status: Proposed
Date: YYYY-MM-DD

## Context

[Why is this decision needed?]

## Decision

[What was decided?]

## Consequences

### Benefits
### Costs
### Risks
```
