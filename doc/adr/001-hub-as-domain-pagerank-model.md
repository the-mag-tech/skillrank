# ADR-001: Skill Discovery & Ranking Service for Content Creators

Status: Proposed (revised 2026-02-28)
Date: 2026-02-28

## Context

自媒体创作者需要在 IM-based Agent 空间中（如 OpenClaw / Telegram / WhatsApp）
调用可复用的 AI 能力模块（Skill），完成图文筛选、信息搜索、内容编排与多平台发布。

Skill 分布在多个 Hub（ClawHub、SkillKit Marketplace、Cursor Marketplace 等），
创作者无法高效地发现最适合自己平台和 IP 定位的 Skill。

同时，Prism（知识图谱引擎）的 Scout Worker 需要一个外部信号源来决定：
- 哪些 Hub 值得爬取？
- 哪些 Skill 应该被收录进图谱？
- 收录优先级如何排序？

## Decision

SkillRank 定位为 **独立的外部发现与排名服务**：

### 面向创作者
- 多维索引：Skill / Hub / 创作者 / Domain / 平台
- 搜索与推荐：基于平台适配性（小红书、公众号、X、Instagram、Threads）
  和 IP 类型匹配度，推荐最相关的 Skill

### 面向 Prism Scout
- 作为 Scout Worker 的 **上游数据源**
- Scout 查询 SkillRank 的 `/rank`、`/discover`、`/recommend` 端点
- SkillRank 返回高质量 Skill 列表 + Hub 排名，Scout 据此决定摄入策略

### Hub-as-Domain 排名模型（保留）
- Hub 仍然是主要排名节点（Domain）
- Skill 是 Hub 下的 Metadata
- 排名信号：Hub 活跃度、Skill 数量、贡献者声誉、安装成功率、更新频率
- 交叉信号：fork 关系、贡献者重叠、SDK 可用性

### 数据流方向

```
SkillRank (外部发现)
    │
    │  /rank, /discover, /recommend
    ▼
Prism.Scout (爬虫)
    │
    │  选择性摄入
    ▼
Prism (图谱存储 + 检索)
    │
    │  Recall / Search
    ▼
IM Agent → 创作者
```

SkillRank 不依赖 Prism，不嵌入 Prism。两者通过 HTTP API 解耦。

## V1 Target Platforms

图文内容优先：
1. 小红书 (Xiaohongshu / RED)
2. 微信公众号 (WeChat Official Accounts)
3. Twitter / X
4. Instagram
5. Threads

## Tech Stack

- **Runtime**: Cloudflare Workers (TypeScript)
- **Database**: D1 (SQLite) → Railway Postgres (production)
- **Crawl**: 通过 Hub SDK 包直接调用，不爬 API
- **API**: `/rank`, `/hubs`, `/discover`, `/recommend`, `/search`

## Consequences

### Benefits
- 独立部署，不与 Prism 耦合——可各自独立迭代
- Scout 有了"外部眼睛"，不需要自己维护 Hub 注册表
- 创作者通过 IM Agent 间接受益，无需直接使用 SkillRank
- CF Worker 轻量部署，运维成本极低

### Costs
- 需要维护 Hub 适配器（每个 Hub 的 SDK 调用方式不同）
- 初期 Hub 数量少（~10），排名区分度有限
- 需要定义 Skill 与平台的适配性元数据标准

### Risks
- Hub SDK 版本变更可能导致爬取失败
- 创作者对 Skill 质量的主观判断可能与排名算法不一致
- V1 聚焦图文，未来扩展到视频/音频需要重新评估信号权重
