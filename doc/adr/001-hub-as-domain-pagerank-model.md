# ADR-001: Hub-as-Domain PageRank Model

Status: Proposed
Date: 2026-02-28

## Context

The AI agent skill ecosystem is fragmented across multiple hubs (ClawHub,
SkillKit Marketplace, Cursor Marketplace, etc.). Developers need a way to
discover which hubs are most reliable, well-maintained, and relevant.

Traditional approaches rank individual skills. But skills are ephemeral
metadata — they come and go. Hubs are the durable infrastructure. A hub's
quality signals (uptime, freshness, contributor reputation, skill count,
install success rate) are more meaningful than any single skill's rating.

## Decision

Adopt a PageRank-inspired model where:

- **Hubs are Domains** (the primary ranked nodes)
- **Skills are Metadata** under each hub (not ranked directly)
- **Signals** flow between hubs via cross-references:
  - Fork relationships (skill X on Hub A is forked from Hub B)
  - Contributor overlap (same author publishes to multiple hubs)
  - SDK availability (hub provides installable CLI/SDK)
  - API freshness (how recently the hub's catalog was updated)

The ranking formula weights these signals to produce a hub-level
quality score, analogous to how PageRank scores domains, not pages.

## Consequences

### Benefits
- Focuses ranking on durable infrastructure, not ephemeral content
- Cross-hub links create a natural graph structure for PageRank
- Hub-level scores are stable (don't fluctuate with individual skill changes)
- Simpler data model: N hubs << M skills

### Costs
- Cannot directly compare individual skills across hubs
- Requires maintaining hub registry (manual curation for new hubs)

### Risks
- Small number of hubs (currently ~5-10) may not produce meaningful
  PageRank differentiation — may need additional scoring dimensions
- Hub APIs may change without notice, requiring adapter maintenance
