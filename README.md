# SkillRank

面向自媒体创作者的 **Skill 发现与排名服务**。

## Concept

自媒体创作者通过 IM Agent（WhatsApp / Telegram / 微信等）调用 AI 能力模块（Skill），
完成图文筛选、信息搜索、内容编排与多平台发布。SkillRank 帮助创作者发现最适合其 IP 定位
的 Skill，同时作为 [Prism](https://github.com/ERerGB/prism) 知识图谱引擎的
Scout Worker 上游数据源。

**核心模型**: Hub 是 Domain（排名节点），Skill 是 Metadata。排名基础设施，不排名内容。

## Architecture

```
SkillRank (CF Worker)              Prism (知识图谱引擎)
├── Registry  — Hub 定义 + SDK      ┌──────────────────┐
├── Crawler   — 定时 SDK 调用       │ Scout Worker     │
├── Ranker    — 多维排名            │  查询 SkillRank  │
├── D1/PG     — 存储               │  决定收录策略    │
└── API       — /rank /discover     └──────────────────┘
               /recommend /search
```

## V1 Target Platforms

图文内容优先：小红书 · 微信公众号 · X · Instagram · Threads

## Status

**Scaffolding phase** — engineering governance established, implementation pending.

See [ADR-001](doc/adr/001-hub-as-domain-pagerank-model.md) for architecture decisions.

## Development

```bash
pnpm install
pnpm dev                        # wrangler dev
pnpm test                       # vitest
npx tsx scripts/generate-doc-index.ts all  # regenerate doc indexes
```

## Engineering Governance

- **ADRs**: `doc/adr/` — immutable architectural decisions
- **Pitfalls**: `doc/pitfall/` — bugs, gotchas, lessons learned
- **AGENTS.md**: mandatory rules for AI agents and human developers
- **Auto-indexed docs**: `<!-- INDEX:START/END -->` markers, never hand-edit

## License

MIT
