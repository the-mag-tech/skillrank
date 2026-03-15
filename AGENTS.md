# AGENTS.md — SkillRank

## What is SkillRank

面向自媒体创作者的 **Skill 发现与排名服务**，同时作为 **Prism Scout 的上游数据源**。

- **面向创作者**：多维索引（Skill / Hub / 创作者 / Domain / 平台），
  推荐最适合其 IP 定位和目标平台的 AI 能力模块
- **面向 Prism**：Scout Worker 查询 SkillRank 决定"从哪里收录什么 Skill"
- **Hub-as-Domain**：Hub 是主要排名节点，Skill 是 Hub 下的 Metadata
- **V1 平台**：小红书、微信公众号、X、Instagram、Threads（图文优先）

## Mandatory Rules

1. **ADR governance**: Every architectural decision must be recorded in `doc/adr/`.
   ADRs are immutable once decided. To reverse a decision, create a new ADR that supersedes it.
2. **Auto-generated indexes**: Never hand-edit the index table between
   `<!-- INDEX:START -->` and `<!-- INDEX:END -->` markers in any README.md.
   Run `npx tsx scripts/generate-doc-index.ts all` after adding new docs.
3. **TDD methodology**: Write failing tests first, then implement, then refactor.
   Tests live in `tests/` directory, colocated by module.
4. **Zero-mock testing**: Test against real services where possible.
   Use D1 local bindings or Miniflare for Cloudflare Workers testing.
5. **DRY principle**: Every piece of knowledge has a single, authoritative representation.

## Architecture Overview

```
SkillRank (CF Worker)              Prism (独立引擎)
┌────────────────────┐             ┌──────────────────┐
│ Registry (Hubs)    │             │ Scout Worker     │
│ Crawler (SDK 调用) │  ◄─── API ──│  "收录什么？"    │
│ Ranker (排名)      │             │  "从哪里收录？"  │
│ D1 / Postgres      │             └──────────────────┘
│ API:               │
│  /rank             │
│  /hubs             │
│  /discover         │
│  /recommend        │
│  /search           │
└────────────────────┘
```

- **Registry**: Hub 定义（名称、SDK 包、爬取配置）
- **Crawler**: 定时调用 Hub SDK，收集 Skill 元数据
- **Ranker**: 多维排名（Hub 质量 + Skill 平台适配性 + 创作者维度）
- **API**: Prism Scout 和外部消费者的查询接口
- **与 Prism 的关系**: SkillRank 是 Scout 的上游数据源，通过 HTTP API 解耦

## Reference Sub-Documents

| Document | Path | When to read |
|----------|------|--------------|
| Architecture details | `doc/agents/architecture.md` | Deep-dive into module design, data flow |
| Known issues | `doc/agents/known-issues.md` | Debugging, workarounds, open items |
| DX Tooling | `doc/agents/dx-tooling.md` | Skills, commands, doc governance |

## Tech Stack

- **Runtime**: Cloudflare Workers (TypeScript)
- **Database**: D1 (SQLite) for development, Railway Postgres for production
- **Package Manager**: pnpm
- **Testing**: Vitest + Miniflare
- **Docs**: ADR + Pitfall + Auto-generated indexes

## Build & Dev

```bash
pnpm install                    # Install dependencies
pnpm dev                        # Local dev (wrangler dev)
pnpm test                       # Run tests (vitest)
pnpm deploy                     # Deploy to CF Workers
npx tsx scripts/generate-doc-index.ts all  # Regenerate doc indexes
```
