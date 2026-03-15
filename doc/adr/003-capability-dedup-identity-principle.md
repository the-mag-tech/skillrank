# ADR-003: Capability Dedup Identity Principle

Status: Proposed
Date: 2026-03-15

> Discussion: [discussion log](003-capability-dedup-identity-principle.discussion.md)

## Context

In multi-hub ecosystems, the same capability can appear as different artifacts:

- `skill` package entries
- `sub-agent` templates
- mirrored distribution paths
- backup or export copies

Current UI/runtime surfaces often deduplicate by file location only. As a
result, semantically identical artifacts still appear as separate entries.

## Decision

Define dedup in two layers:

1. **Artifact Identity** (storage-level)
2. **Capability Identity** (semantic-level)

Search and ranking in SkillRank should deduplicate by **Capability Identity**,
while preserving artifact variants for traceability.

### Capability Identity Rule

Two artifacts are considered the same capability when all checks pass:

1. **Normalized text fingerprint match**  
   - Deterministic normalization (strip boilerplate, normalize whitespace,
     normalize headings/frontmatter key order, remove path-specific examples)
   - Hash match on normalized content (`sha256(normalized_text)`)

2. **Embedding similarity gate**  
   - Cosine similarity of capability embeddings >= `0.995`
   - Length ratio guard: `0.9 <= len(a)/len(b) <= 1.1`

3. **Type compatibility guard**  
   - `skill` and `sub-agent` can merge only if intent/task scope is equivalent
   - Otherwise mark as `related_variant`, not deduped canonical

### Canonical Selection

If multiple artifacts map to one capability:

- Prefer source with stronger provenance (official hub > mirror > backup path)
- Prefer freshest maintained source
- Keep other artifacts as `aliases` linked to canonical capability ID

## Consequences

### Benefits

- Eliminates duplicate search results for the same capability
- Keeps explainability: users can still inspect alias origins
- Enables cross-hub quality aggregation at capability level

### Costs

- Requires normalization pipeline maintenance
- High-threshold embedding checks increase indexing compute

### Risks

- Over-merging near-identical but intentionally different templates
- Under-merging when normalization misses structurally equivalent phrasing

## Implementation Notes

V1 can ship with deterministic fingerprint + manual review flags.  
Embedding gate can be enabled as V2 once baseline false-positive/false-negative
rates are measured.
