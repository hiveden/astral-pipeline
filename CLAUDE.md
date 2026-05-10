# CLAUDE.md

这是 **astral-pipeline**（astral 系列的 data + control plane，详见 [README.md](./README.md)）。

## 语言

中文回复（沿用全局规则）。

## 红线

- **只读不写**（除非你是 script / tts / ai-engineer-roadmap 任一 agent，且只动你自己的子目录；或在执行 openspec 变更）
- 不要 grep `*.wav` / `*.mp4` / `*.png` —— 噪音爆炸，pipeline 总量 2 G+
- 跨仓修改：到对应仓的项目目录改（`~/projects/astral-video/` 等），不要在这里改其他仓的代码

## 路由

| 你想做什么 | 看哪 |
|---|---|
| 理解契约 / 角色 | [README.md](./README.md) |
| 系列白名单 / id 命名规则 | `schemas/series.json` + `.bin/_lib/episode-id.js` |
| 看具体 episode 数据 | `.bin/status <id>` 或直接 `ls episodes/<id>/`（老 episode 在根目录） |
| 创建新 episode | `.bin/new-episode <id> [--offline]` |
| 跨方契约（manifest / overlay 等） | `schemas/*.schema.json` |
| 历史决策 / 旧 HANDSHAKE | `git log` + `openspec/changes/` |
| 治理变更 | `openspec/changes/<name>/` 4 件套（proposal / design / specs / tasks） |

## episodes 路径双兼容

- 新 episode 一律建在 `episodes/<id>/`
- 老 episode 仍在根目录 `<id>/`，消费方双路径 fallback 兼容
- 软迁移无 deadline；闲时 `mv <id> episodes/<id>` + 重建下游 symlink
