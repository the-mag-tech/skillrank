# Architecture Decision Records

This directory contains all ADRs for SkillRank.

ADRs are immutable once decided. To reverse or modify a decision,
create a new ADR that supersedes the original.

## Index

<!-- INDEX:START -->
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 001 | [Hub-as-Domain PageRank Model](001-hub-as-domain-pagerank-model.md) | Proposed | 2026-02-28 |
| 002 | [D1 Database Schema Design](002-d1-schema-design.md) | Proposed | 2026-02-28 |
| 003 | [Capability Dedup Identity Principle](003-capability-dedup-identity-principle.md) | Proposed | 2026-03-15 |
| 004 | [Registry Module Design](004-registry-module-design.md) | Proposed | 2026-03-16 |
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

> Discussion: [discussion log](NNN-topic.discussion.md)

## Context

[Why is this decision needed?]

## Decision

[What was decided?]

## Consequences

### Benefits
### Costs
### Risks
```
