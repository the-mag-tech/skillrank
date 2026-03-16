# ADR-004 Registry Module Design — Discussion Log

## Session 2026-03-16 — From Scope Question to Implementation Blueprint

### Starting Point

With ADR-001 (Hub-as-Domain model), ADR-002 (D1 schema), and ADR-003
(Capability Dedup Identity Principle) in place, the team needed to decide
how the Registry module should be implemented — specifically whether it
should only handle Hub CRUD + SDK adapters, or also own skill cleansing.

### Decision Journey

The discussion progressed through several stages:

1. **Initial scope analysis**: Registry's documented responsibility was
   "Hub definitions + SDK adapters" (`src/registry/hubs.ts`, `adapters/`).
   ADR-003 introduced capability dedup but did not assign it to any module.

2. **Three options evaluated**:
   - (A) Extend Registry to include cleansing
   - (B) Put cleansing in Crawler
   - (C) Create a new dedicated module
   
   > **[Human]** proposed option (A): since Registry already understands Hub
   > and Skill types, and the cleansing pipeline is a stateless transform on
   > `SkillMeta`, it fits naturally as part of Registry. Crawler should only
   > own scheduling and rate-limit management.

3. **Hub ecosystem survey**: To validate the design, a survey of 10+ real
   hubs was conducted. Key findings:
   - ClawHub: ~3,286 skills (native registry, REST API confirmed)
   - SkillKit: ~21,745 (aggregator indexing GitHub)
   - SkillsMP: ~66,500–517,586 (aggregator, rapid growth)
   - agentskill.sh: ~110,000 (aggregator)
   - Total raw entries across all hubs: 300K–750K
   - Unique capabilities after dedup: estimated 10K–30K
   
   > **[Human]** observed that aggregator hubs overlap heavily — the same
   > `self-improving-agent` appears in ClawHub, Playbooks, SkillKit, and
   > agentskill.sh. This confirmed that ADR-003's capability dedup is not
   > just theoretical but operationally critical.

4. **Resource feasibility concern**: Full indexing of all hubs requires
   ~300K HTTP requests, ~1 GB bandwidth, and approaches D1 daily write
   limits. Running the entire cold-start in a single day is infeasible
   on Cloudflare Workers.

   > **[Human]** proposed batch cold-start: process one hub-batch per
   > scheduled run, taking ~30 days to complete initial indexing. After
   > that, daily incremental updates of ~2,000 skills are trivial.
   > This keeps dedup in Registry (the logic is sound) while moving the
   > scaling concern to Crawler's scheduling layer.

5. **Issue #4 integration**: The Prism ScoutSystem → SkillRank handoff
   requires `source` and `prism_entity_id` fields on the `hubs` table.
   These were added to the schema extension to avoid a future migration.

### Key Human Insights

1. **"Registry 的去重有点不符合目前的情况"** — Initially flagged the scale
   concern. But then reframed: the issue is not Registry's processing
   capability (CPU and logic are fine), but the cold-start scheduling.
   Separating "what to do" (Registry) from "when to do it" (Crawler)
   resolves the concern without moving dedup out of Registry.

2. **"第一次 registry 时量太大就分批次来做"** — The insight that cold-start
   is a one-time cost, and daily incremental is tiny, made the batch
   strategy viable. This is a standard pattern for index-building systems.

3. **Cross-hub overlap is the core problem** — The survey showed that
   raw skill counts are inflated by 10–25x across aggregators. Without
   capability dedup, SkillRank search results would show the same skill
   5–7 times from different hubs.

### Downstream Effects

- **Extends**: ADR-002 — adds `capabilities` table, `crawl_progress` table,
  new columns on `hubs` and `skills`.
- **Implements**: ADR-003 V1 — deterministic fingerprint + manual review flags,
  applied in Registry's cleansing pipeline.
- **Implements**: Issue #4 — Prism handoff via `source` and `prism_entity_id`
  fields on `hubs` table.
- **Interacts**: Crawler module — Registry exposes stateless transform functions;
  Crawler owns batch scheduling and `crawl_progress` state.

### Open Questions

- Which aggregator hubs have stable, documented APIs vs. requiring scraping?
- Should cold-start priority order be by hub size (small first) or by
  uniqueness (native registries first to seed capabilities table)?
- What is the right normalization rule set for V1 (minimal vs. comprehensive)?

---

## Session 2026-03-16 — V1 Implementation Blueprint 落地

### Starting Point

ADR-004 主体已确定 Registry 模块的范围（Hub 管理 + 适配器 + 清洗管道）、
Schema 扩展、冷启动批处理策略和 Prism 对接字段。但文档仅描述了 **设计原则**，
缺乏可直接指导编码的实施蓝图：文件结构、类型定义、模块间接口、开发阶段划分
和测试场景。

### Decision Journey

1. **文件结构设计**：讨论后确定 `src/registry/` 下按职责拆分为 7 个核心文件 +
   10 个适配器文件。关键分离点：
   - `normalizer.ts` 和 `fingerprint.ts` 是纯函数，无 I/O 依赖，易于测试。
   - `capability-map.ts` 封装 D1 查询逻辑，负责 fingerprint → capability 的映射。
   - `hub-store.ts` 和 `skill-store.ts` 分别管理 Hub 和 Skill 的持久化。

2. **数据流明确化**：绘制了从 `adapter.crawl()` 到 `skillStore.upsert()` 的
   完整流水线。每个环节职责单一：
   ```
   adapter → normalizer → fingerprint → capabilityMap → skillStore
   ```
   > **[Human]** 要求把整个 Registry 开发需要的架构和可能涉及到的接口
   > 打包成可执行的文档，直接补充进 ADR-004。

3. **接口边界划定**：Registry 暴露给三个消费方的接口被显式列出：
   - **API 模块**：Hub CRUD + Skill 搜索（按 capability 去重）
   - **Crawler 模块**：适配器获取 + 清洗管道（normalize → fingerprint → resolve）
   - **Ranker 模块**：只读访问 Hub 列表和 Skill 统计

4. **开发阶段拆分**：三阶段递进，总计 4–6 天：
   - Phase 1（基础层）：类型 + Migration + Hub CRUD
   - Phase 2（适配器层）：接口 + 10 个 stub
   - Phase 3（清洗层）：归一化 + 指纹 + 能力映射 + Skill 持久化

5. **测试场景**：10 个覆盖关键路径的场景，包括 CRUD、归一化幂等性、
   跨 Hub 去重、Canonical Selection 和 upsert 幂等性。

### Key Human Insights

1. **"给我一个可以用于代码执行的文档"** — 推动了从抽象设计原则到可执行
   蓝图的转变。ADR 不仅记录决策，还应提供足够的实施细节，使开发者无需
   额外沟通即可开始编码。

2. **接口文档优先于实现** — 先明确 Registry 暴露给 API / Crawler / Ranker
   的接口签名，再填充实现。这确保模块间的契约在编码前就已对齐。

### Downstream Effects

- **ADR-004 变更**：追加了 V1 Implementation Blueprint 章节（约 200 行），
  包含模块架构图、数据流图、类型定义、公共接口、开发阶段表和测试场景表。
- **后续编码**：开发者可直接按 Phase 1 → 2 → 3 顺序开始实现，类型定义和
  接口签名已固定。
- **测试先行**：10 个测试场景可直接转化为 Vitest 测试用例，符合 TDD 方法论。

### Open Questions

- `normalizer.ts` 的归一化规则集 V1 具体包含哪些转换（strip boilerplate?
  reorder frontmatter? remove path-specific examples?）？
- 适配器 stub 是否需要返回 fixture 数据以支持本地开发，还是直接返回空数组？
- `skillStore.search()` 的全文搜索在 D1 上用 LIKE 还是 FTS5？
