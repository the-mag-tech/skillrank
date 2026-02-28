# DX Tooling — SkillRank

## Auto-Generated Doc Indexes

ADR and Pitfall README.md index tables are derived from file frontmatter.

```bash
npx tsx scripts/generate-doc-index.ts all      # regenerate both indexes
npx tsx scripts/generate-doc-index.ts adr      # ADR only
npx tsx scripts/generate-doc-index.ts pitfall  # Pitfall only
```

**Convention**: Each ADR/Pitfall file must include structured frontmatter
(title in H1, Status/Date lines). The script parses these and regenerates the
`<!-- INDEX:START -->` ... `<!-- INDEX:END -->` section in README.md.

**Rule**: Never hand-edit the index table between the markers.

## Documentation Governance — Three-Layer Model

| Layer | Content | Source of Truth | Stales when... |
|-------|---------|-----------------|----------------|
| **Structural** | Dependencies, module state, doc indexes | `generate-doc-index.ts`, `wrangler.toml` | Never (auto-generated) |
| **Semantic** | In-code annotations (`@see ADR-NNN`) | Code itself | Code changes without updating annotations |
| **Rationale** | ADRs, Pitfalls | `doc/adr/`, `doc/pitfall/` | Architecture changes without new ADR |

## Testing

```bash
pnpm test                  # All tests
pnpm test -- --reporter verbose  # Verbose output
```

Framework: Vitest + Miniflare (for D1/Workers testing)
