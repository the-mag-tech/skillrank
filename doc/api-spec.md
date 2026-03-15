# SkillRank API Specification

Base URL: `https://skillrank.{domain}/api/v1`

## Endpoints

### GET /hubs

List all registered hubs with their latest scores.

**Response** `200 OK`
```json
{
  "hubs": [
    {
      "id": "clawhub",
      "name": "ClawHub",
      "url": "https://clawhub.com",
      "score": 0.87,
      "skillCount": 156,
      "lastCrawled": "2026-02-28T12:00:00Z"
    }
  ]
}
```

---

### POST /hubs

Register a new hub.

**Request**
```json
{
  "id": "newhub",
  "name": "New Hub",
  "url": "https://newhub.dev",
  "apiUrl": "https://api.newhub.dev/v1",
  "sdkPackage": "newhub-sdk"
}
```

**Response** `201 Created`
```json
{
  "id": "newhub",
  "name": "New Hub",
  "createdAt": "2026-02-28T12:00:00Z"
}
```

---

### GET /rank

Get hub quality scores. Returns all hubs ranked by score descending.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `hubId` | string | Optional. Filter to specific hub. |
| `limit` | number | Optional. Max results (default 20). |

**Response** `200 OK`
```json
{
  "rankings": [
    {
      "hubId": "clawhub",
      "score": 0.87,
      "signals": {
        "api_freshness": 0.92,
        "skill_count": 156,
        "sdk_available": true,
        "uptime_30d": 0.997
      },
      "computedAt": "2026-02-28T12:00:00Z"
    }
  ]
}
```

---

### GET /search

Search skills across all hubs.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (matches name, description, tags) |
| `platform` | string | Filter by platform tag (e.g. "xiaohongshu") |
| `hubId` | string | Filter to specific hub |
| `limit` | number | Max results (default 20) |

**Response** `200 OK`
```json
{
  "results": [
    {
      "skillId": "clawhub:auto-doc-index",
      "hubId": "clawhub",
      "name": "Auto Doc Index",
      "description": "Auto-generate doc indexes from frontmatter",
      "author": "ERerGB",
      "tags": ["documentation", "automation"],
      "hubScore": 0.87
    }
  ]
}
```

---

### POST /signal

Receive feedback signals from Prism.
@decision skillet:002

**Request**
```json
{
  "hubId": "clawhub",
  "signals": [
    {
      "type": "citation_density",
      "value": 0.73,
      "metadata": { "sample_size": 42 }
    },
    {
      "type": "contributor_reputation",
      "value": 0.85,
      "metadata": { "unique_contributors": 12 }
    }
  ],
  "source": "prism",
  "timestamp": "2026-02-28T12:00:00Z"
}
```

**Signal Types**
| Type | Description |
|------|-------------|
| `citation_density` | How often hub's skills are referenced by other skills |
| `contributor_reputation` | Average contributor quality in the knowledge graph |
| `content_quality` | Structural completeness of skill Markdown |
| `fork_inbound` | Number of skills in other hubs forked from this hub |
| `semantic_uniqueness` | How unique the hub's skill offerings are |

**Response** `202 Accepted`
```json
{
  "received": 2,
  "hubId": "clawhub"
}
```

**V1 behavior**: Signals are stored in the `signals` table but do not
affect ranking calculations. V2 will integrate them into the PageRank formula.

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Hub not found: invalid-hub"
  }
}
```

| Status | Code | When |
|--------|------|------|
| 400 | `INVALID_REQUEST` | Missing required fields, bad format |
| 404 | `NOT_FOUND` | Hub or skill not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
