# ADR-003 Capability Dedup Identity Principle — Discussion Log

## Session 2026-03-15 — Why "Same Content" Still Duplicates

### Starting Point

The team observed that even when sub-agent and skill contents are effectively
the same, current surfaces do not automatically deduplicate them.

### Decision Journey

The discussion started from an operational pain point: repeated capability
entries pollute discovery results and reduce trust in search quality.

> **[Human]** pointed out that identical serialized content across sub-agent
> and skill artifacts still appears as duplicates in display layers.

This led to a key reframing: dedup cannot rely on path or artifact type alone.
It must separate "what file this is" from "what capability this represents."

> **[Human]** proposed an embedding-based principle as one possible criterion,
> then asked for a higher-level abstract definition that can be recorded in a
> core architecture repository.

The resulting model defines two identities:

- Artifact identity for storage/provenance
- Capability identity for retrieval/ranking dedup

### Key Human Insights

1. **Semantic duplicates are the real problem**
   - Path-level uniqueness is insufficient for user-facing discovery quality.
2. **Need an abstract principle, not an ad-hoc cleanup**
   - Prevents recurring duplicate drift as hubs and artifact types expand.
3. **Record in core retrieval layer**
   - SkillRank is the right place because dedup affects search/ranking behavior.

### Downstream Effects

- **Interacts**: Search result rendering should collapse by capability identity.
- **Interacts**: Registry cleanup can be automated using capability aliases.
- **Validated**: A two-layer identity model (artifact vs capability) is required
  for scalable cross-hub dedup.

### Open Questions

- What normalization transforms should be mandatory vs optional?
- Should threshold values vary by category (prompt-only vs tool-integrated)?
- What is the review workflow for low-confidence merge candidates?
