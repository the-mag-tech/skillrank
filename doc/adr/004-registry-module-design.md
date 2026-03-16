# ADR-004: Registry Module Design

Status: Proposed
Date: 2026-03-16

> Discussion: [discussion log](004-registry-module-design.discussion.md)

## Context

SkillRank's architecture specifies a Registry module (`src/registry/`) responsible
for Hub definitions and SDK adapters. Three prior ADRs establish foundational
decisions that Registry must implement:

- **ADR-001** defines hubs as primary ranked entities and skills as metadata.
- **ADR-002** defines the base D1 schema (`hubs`, `skills`, `signals`,
  `rank_history`, `crawl_logs`).
- **ADR-003** defines the two-layer identity model (Artifact / Capability)
  and the fingerprint-based dedup principle.

However, no ADR specifies:

1. What Registry's module boundary is (Hub CRUD only, or also skill cleansing?).
2. How 10+ heterogeneous hubs are adapted behind a uniform interface.
3. What schema extensions are needed beyond ADR-002 to support ADR-003 and
   the Prism registration handoff (Issue #4).
4. How the cold-start indexing of 300K–750K skills across all hubs is handled.

### Hub Ecosystem Scale (as surveyed 2026-03-16)

| Hub | Type | Skill Count |
|-----|------|-------------|
| ClawHub | Native registry | ~3,286 |
| SkillKit | Aggregator | ~21,745 |
| Playbooks | Aggregator | ~24,120 |
| SkillsMP | Aggregator | ~66,500–517,586 |
| agentskill.sh | Aggregator | ~110,000 |
| Skills Directory | Aggregator | ~36,109 |
| Claude Skills Dir | Aggregator | ~17,878 |
| Skills Playground | Aggregator | ~8,634 |
| Cursor Marketplace | Curated plugins | ~50–80 plugins |
| PulseMCP | MCP server index | ~10,854 |

Aggregator hubs index from GitHub and overlap heavily. The raw sum exceeds
750K entries, but unique capabilities are estimated at 10K–30K after dedup.

## Decision

### 1. Registry Module Scope

Registry owns three concerns:

- **Hub management**: CRUD for the `hubs` table.
- **Hub adaptation**: A uniform `HubAdapter` interface per hub.
- **Skill cleansing**: Normalization, fingerprinting, and capability mapping
  for every `SkillMeta` before it enters D1.

The cleansing pipeline implements **ADR-003 V1** (deterministic fingerprint +
manual review flags). Crawler is responsible for scheduling and rate-limit
management; Registry is a stateless transform that Crawler invokes per-skill.

### 2. Unified Adapter Pattern

```typescript
interface HubAdapter {
  readonly hubId: string;
  crawl(cursor?: string): Promise<CrawlResult>;
}
```

Each hub gets a dedicated adapter file. All adapters return the same
`CrawlResult` shape. V1 ships with stub implementations; real API integration
replaces stubs per-hub as APIs are confirmed.

A registry function `getAdapter(hubId): HubAdapter | null` maps hub IDs to
adapter instances. Adding a new hub = adding one adapter file + one seed row.

### 3. Schema Extensions (extends ADR-002)

New table — `capabilities`:

```sql
CREATE TABLE capabilities (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  fingerprint     TEXT NOT NULL UNIQUE,
  canonical_skill TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Extended columns on `hubs` (for Issue #4 Prism handoff):

```sql
ALTER TABLE hubs ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE hubs ADD COLUMN prism_entity_id TEXT;
```

Extended columns on `skills` (for ADR-003 capability mapping):

```sql
ALTER TABLE skills ADD COLUMN artifact_type TEXT NOT NULL DEFAULT 'skill';
ALTER TABLE skills ADD COLUMN provenance TEXT NOT NULL DEFAULT 'official';
ALTER TABLE skills ADD COLUMN fingerprint TEXT;
ALTER TABLE skills ADD COLUMN capability_id TEXT REFERENCES capabilities(id);
ALTER TABLE skills ADD COLUMN alias_of TEXT;
```

New indexes:

```sql
CREATE INDEX idx_skills_capability ON skills(capability_id);
CREATE INDEX idx_skills_fingerprint ON skills(fingerprint);
```

New table — `crawl_progress` (for batch cold-start):

```sql
CREATE TABLE crawl_progress (
  hub_id      TEXT PRIMARY KEY REFERENCES hubs(id),
  status      TEXT NOT NULL DEFAULT 'pending',
  cursor      TEXT,
  processed   INTEGER DEFAULT 0,
  total       INTEGER,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4. Cold-Start Batch Strategy

Full indexing of all hubs cannot complete in a single Worker invocation due to:

- Cloudflare Workers subrequest limits (1,000/invocation on paid plan).
- Hub API rate limits (60–600 requests/minute depending on hub).
- D1 daily write limits (1M rows/day on paid plan).

Strategy:

- **Cold-start phase (~30 days)**: Each daily `scheduled` run processes one
  hub batch. `crawl_progress` tracks cursor position per hub. Hubs are
  processed in priority order (native registries first, aggregators later).
- **Incremental phase (ongoing)**: After all hubs reach `status = 'complete'`,
  daily runs only fetch updated skills (`sort=updated` with timestamp filter).
  Estimated daily volume: 500–2,000 skills across all hubs.

Dedup is effective during cold-start because capabilities discovered from
early hubs are matched by fingerprint when later (overlapping) hubs are
processed. The `capabilities` table growth is sublinear.

### 5. Prism Registration Handoff (implements Issue #4)

When Prism's ScoutSystem discovers a new hub, it calls `POST /hubs` with:

```json
{
  "id": "newhub",
  "name": "New Hub",
  "url": "https://newhub.dev",
  "source": "prism_scout",
  "prismEntityId": "skill_hub:newhub"
}
```

`source` and `prism_entity_id` are stored in `hubs` for traceability and for
the Feedback module to route scores back to Prism.

### 6. Initial Hub Seeds (extends ADR-002)

ADR-002 specified 3 seeds. Updated to 10+ based on ecosystem survey:

```sql
INSERT INTO hubs (id, name, url, source) VALUES
  ('clawhub',           'ClawHub',              'https://clawhub.ai',          'manual'),
  ('skillkit',          'SkillKit',             'https://skillkit.io',         'manual'),
  ('cursor',            'Cursor Marketplace',   'https://cursor.com',          'manual'),
  ('skillsmp',          'SkillsMP',             'https://skillsmp.com',        'manual'),
  ('agentskill',        'agentskill.sh',        'https://agentskill.sh',       'manual'),
  ('playbooks',         'Playbooks',            'https://playbooks.com',       'manual'),
  ('skills-directory',  'Skills Directory',     'https://skillsdirectory.com', 'manual'),
  ('claude-skills-dir', 'Claude Skills Dir',    'https://skillsdir.dev',       'manual'),
  ('skills-playground', 'Skills Playground',    'https://skillsplayground.com','manual'),
  ('pulsemcp',          'PulseMCP',             'https://pulsemcp.com',        'manual');
```

## Consequences

### Benefits

- Clear module boundary: Registry is a stateless transform, Crawler owns scheduling.
- Uniform adapter interface makes adding new hubs mechanical.
- Schema extensions are additive — ADR-002 base tables remain unchanged.
- Cold-start batch strategy stays within all CF Workers resource limits.
- Prism handoff fields enable the full Issue #4 workflow without schema migration later.

### Costs

- 10+ adapter stubs to maintain (low effort per adapter, but breadth).
- `crawl_progress` adds operational state that must be monitored during cold-start.
- Normalization rules require ongoing tuning as skill formats evolve.

### Risks

- Aggregator hubs may not have stable APIs; adapters may break frequently.
- Cold-start taking ~30 days means ranking quality is limited until completion.
- Over-indexing from aggregators may inflate D1 storage before dedup converges.

---

## V1 Implementation Blueprint

### Module Architecture

```
src/registry/
│
├── types.ts                 ← 全局类型定义
│   exports: Hub, HubCreateInput, Skill, Capability,
│            ArtifactType, Provenance, SkillMeta, CrawlResult
│
├── hub-store.ts             ← Hub 管理层
│   exports: class HubStore
│   depends: types.ts, D1
│
├── skill-store.ts           ← Skill 持久化层
│   exports: class SkillStore
│   depends: types.ts, D1
│
├── normalizer.ts            ← 内容归一化
│   exports: normalize(meta: SkillMeta): string
│   depends: types.ts
│   pure function, no I/O
│
├── fingerprint.ts           ← 指纹计算
│   exports: computeFingerprint(text: string): Promise<string>
│   depends: Web Crypto API
│   pure function, no I/O
│
├── capability-map.ts        ← 能力映射与去重
│   exports: class CapabilityMap
│   depends: types.ts, D1, fingerprint.ts
│
└── adapters/
    ├── adapter.ts           ← 适配器接口 + 注册表
    │   exports: HubAdapter (interface), getAdapter(hubId)
    ├── clawhub.ts           ← ClawHub 适配器 (stub)
    ├── skillkit.ts          ← SkillKit 适配器 (stub)
    ├── skillsmp.ts          ← SkillsMP 适配器 (stub)
    ├── agentskill.ts        ← agentskill.sh 适配器 (stub)
    ├── playbooks.ts         ← Playbooks 适配器 (stub)
    ├── skills-directory.ts  ← Skills Directory 适配器 (stub)
    ├── claude-skills-dir.ts ← Claude Skills Dir 适配器 (stub)
    ├── skills-playground.ts ← Skills Playground 适配器 (stub)
    ├── cursor-marketplace.ts← Cursor Marketplace 适配器 (stub)
    └── pulsemcp.ts          ← PulseMCP 适配器 (stub)
```

### Internal Data Flow

```
               Crawler 调用入口
                     │
                     ▼
            ┌─ adapter.crawl() ─┐
            │  返回 CrawlResult  │
            │  { skills: [...] } │
            └────────┬──────────┘
                     │  SkillMeta[]
                     ▼
           ┌─ normalizer ──────┐
           │ normalize(meta)   │
           │ → normalizedText  │
           └────────┬──────────┘
                    │  string
                    ▼
           ┌─ fingerprint ─────┐
           │ computeFingerprint│
           │ → sha256 hex      │
           └────────┬──────────┘
                    │  string
                    ▼
        ┌─ capabilityMap.resolve() ─┐
        │ 查 capabilities 表:       │
        │  fingerprint 匹配?        │
        │   ├─ 是 → 已有 capability │
        │   │       标记 alias_of   │
        │   └─ 否 → 新建 capability │
        └────────────┬──────────────┘
                     │  { capabilityId, isNew, aliasOf }
                     ▼
          ┌─ skillStore.upsert() ──┐
          │ 写入 skills 表:        │
          │  hub_id, slug, name,   │
          │  fingerprint,          │
          │  capability_id,        │
          │  artifact_type,        │
          │  provenance, alias_of  │
          └────────────────────────┘
```

### Type Definitions

```typescript
// ─── Hub ───

interface Hub {
  id: string;
  name: string;
  url: string;
  apiUrl: string | null;
  sdkPackage: string | null;
  source: string;              // 'manual' | 'prism_scout'
  prismEntityId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HubCreateInput {
  id: string;
  name: string;
  url: string;
  apiUrl?: string;
  sdkPackage?: string;
  source?: string;
  prismEntityId?: string;
}

// ─── Skill ───

type ArtifactType = 'skill' | 'sub_agent' | 'mirror' | 'backup';
type Provenance = 'official' | 'mirror' | 'backup';

interface Skill {
  id: string;                    // hub_id:slug
  hubId: string;
  slug: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string | null;
  installCount: number;
  tags: string[];
  artifactType: ArtifactType;
  provenance: Provenance;
  fingerprint: string | null;
  capabilityId: string | null;
  aliasOf: string | null;
  crawledAt: string;
}

// ─── Capability ───

interface Capability {
  id: string;
  name: string;
  fingerprint: string;
  canonicalSkill: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Adapter I/O ───

interface SkillMeta {
  slug: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string | null;
  installCount: number;
  tags: string[];
  content?: string;             // SKILL.md raw text (for fingerprinting)
}

interface CrawlResult {
  skills: SkillMeta[];
  nextCursor: string | null;    // for pagination
  total?: number;               // if API provides total count
}
```

### Public Interfaces (consumed by other modules)

#### For API module

```typescript
// GET /hubs
hubStore.list(): Promise<Hub[]>

// GET /hubs?id=xxx
hubStore.getById(id: string): Promise<Hub | null>

// POST /hubs (also used by Prism handoff)
hubStore.create(input: HubCreateInput): Promise<Hub>

// GET /search — results deduplicated by capability
skillStore.search(query: {
  q?: string;
  hubId?: string;
  platform?: string;
  limit?: number;
}): Promise<Skill[]>

// Capability alias lookup
skillStore.findByCapability(capabilityId: string): Promise<Skill[]>
```

#### For Crawler module

```typescript
// Get adapter for a hub
getAdapter(hubId: string): HubAdapter | null

// Adapter fetches one page of skills
adapter.crawl(cursor?: string): Promise<CrawlResult>

// Cleansing pipeline (called per skill)
normalize(meta: SkillMeta): string
computeFingerprint(text: string): Promise<string>
capabilityMap.resolve(
  fingerprint: string,
  meta: SkillMeta,
  hubId: string
): Promise<{ capabilityId: string; isNew: boolean; aliasOf: string | null }>

// Persist cleansed skill
skillStore.upsert(skill: Skill): Promise<void>

// Batch progress tracking (Crawler writes, not Registry)
// Uses crawl_progress table directly
```

#### For Ranker module

```typescript
// Read skill counts per hub (for scoring signals)
skillStore.countByHub(hubId: string): Promise<number>

// Read hub metadata
hubStore.list(): Promise<Hub[]>
hubStore.getById(id: string): Promise<Hub | null>
```

### Development Phases

| Phase | Tasks | Files | Duration | Deliverable |
|-------|-------|-------|----------|-------------|
| **1 — 基础层** | 类型定义 + D1 Migration + Hub CRUD + 测试 | `types.ts`, `0001_init.sql`, `hub-store.ts`, `hub-store.test.ts` | 1–2 天 | Hub 增删改查通过测试 |
| **2 — 适配器层** | 适配器接口 + 10 个 stub | `adapter.ts` + 10 个 adapter 文件 | 1 天 | `getAdapter(hubId).crawl()` 返回有效数据 |
| **3 — 清洗层** | 归一化 + 指纹 + 能力映射 + Skill 写入 + 测试 | `normalizer.ts`, `fingerprint.ts`, `capability-map.ts`, `skill-store.ts` + 4 个 test 文件 | 2–3 天 | 跨 Hub 相同内容自动去重 |

**Registry 模块总计：4–6 天**

### Test Scenarios

| 场景 | 输入 | 期望结果 |
|------|------|----------|
| Hub CRUD 基本流程 | create → getById → update → list | 各操作返回正确数据 |
| Hub 含 Prism 字段 | create with source='prism_scout' | source 和 prism_entity_id 持久化 |
| 归一化幂等性 | 同一 SkillMeta 多次归一化 | 每次输出相同 |
| 空白差异消除 | 两份内容仅空白不同 | 归一化后相同 |
| 路径差异消除 | 两份内容仅路径示例不同 | 归一化后相同 |
| 指纹一致性 | 相同文本 | 相同 sha256 |
| 跨 Hub 相同 skill → 同一 capability | ClawHub 和 SkillKit 各返回同名同内容 skill | 同一 capabilityId，后者 aliasOf 指向前者 |
| 不同 skill → 不同 capability | 不同功能的两个 skill | 不同 capabilityId |
| Canonical Selection | 同一 capability 下 official provenance | canonical_skill 指向 official 来源 |
| Skill upsert 幂等 | 同一 skill 写入两次 | 无重复行，字段更新 |
