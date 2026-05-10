# astral-pipeline

> **🔄 restructure-staging 变更已落地**（2026-05-10，root commit `52e217a`）
> 本仓从"四方契约共享文件夹"升级为 **astral 系列的 data + control plane**。
> 完整变更记录：`openspec/changes/archive/2026-05-10-restructure-staging/{proposal,design,specs,tasks}.md`

> **本仓不再维护文字协议；契约由 `schemas/` 机器可读 + 各端 export 脚本承载。**
> 历史协议 `HANDSHAKE.md` 快照见 `openspec/changes/archive/2026-05-10-restructure-staging/legacy-HANDSHAKE.md`。

astral 系列项目的 **data + control plane**：事实中心（episode 产物 + 元信息）+ 治理入口（统一创建 / 状态查询 / 跨方协调）。

## 四方拓扑

```
  script-agent-harness ─┐  写 raw/{doc,script}/
  tts-agent-harness    ─┼─►  astral-pipeline/episodes/<id>/   ◄── astral-video（symlink 只读消费）
  ai-engineer-roadmap  ─┘  写 raw/recording/（仅 ml/dl/llm）       并向 overlay/ + output.json 写派生与引用
```

## 顶层结构

```
astral-pipeline/
├── README.md           ← 本文件
├── schemas/            ← 机器可读契约（series.json + *.schema.json）
├── .bin/               ← 跨项目治理脚本（new-episode / status / lint-series 等）
├── .templates/         ← 新 episode 骨架模板
├── episodes/           ← 所有新 episode 容器（推荐路径）
│   └── <id>/raw/ overlay/ publish/ manifest.json output.json
├── <id>/               ← 老 episode 留根目录可继续工作（消费方双路径回退）
└── openspec/           ← 变更治理（spec-driven workflow）
```

## 写入归属（红线）

| 子目录 | 写入方 | 内容 |
|---|---|---|
| `<id>/raw/doc/` | script-agent-harness | 原始 md（含表格 / ASCII / mermaid） |
| `<id>/raw/script/` | script-agent-harness | `script.json` + `regions.json` + `screenshots/` |
| `<id>/raw/tts/` | tts-agent-harness | `*.wav` + `durations.json` + `subtitles.json` |
| `<id>/raw/recording/` | ai-engineer-roadmap | 录屏 mp4 + `manifest.json`（仅 ml/dl/llm） |
| `<id>/overlay/` | astral-video | last-mile 派生（字幕 patch / 时序微调） |
| `<id>/publish/` | script-agent-harness | platforms/*.json + cover.json（全局唯一发布元信息） |
| `<id>/manifest.json` | 各方写自己负责的段 | 版本 / 指纹 / consistency 标记 |
| `<id>/output.json` | astral-video | 成品引用（path + sha256 + duration） |

**任何方 MUST NOT 写非自己负责的子目录**。astral-video 是消费者，不可写 raw/ 任何子目录。

## .bin/ 入口

| 命令 | 用途 |
|---|---|
| `.bin/new-episode <id> [--offline]` | 全局唯一新 episode 创建入口（id 校验 + 骨架 + 调 script-harness API） |
| `.bin/status <id>` | 读 manifest 展示 episode 当前状态（双路径回退兼容老 episode） |
| `.bin/lint-series` | 校验 `schemas/series.json` 自身合法性 |

## schemas/ 索引

- `series.json` —— 全局唯一系列白名单（消费方：script-harness / video / 本仓 .bin/）
- `series.schema.json` —— series.json 的 JSON Schema
- `manifest.schema.json` —— `<id>/manifest.json` 契约（P3 阶段落地）
- `overlay.schema.json` —— `<id>/overlay/*.patch.json` 契约（P4 阶段落地）

## 红线

- **不要 grep `*.wav` / `*.mp4` / `*.png`** —— 总量 2 G+，噪音爆炸
- 大文件（wav / mp4 / png > 1MB）只在本地，不上 staging git
- 跨仓修改：到对应仓的项目目录改（不要在这里改其他仓的代码）

## 历史溯源

- 旧 `HANDSHAKE.md`（1435 行四方协议 + 附录 A-O 历史决策）已快照到 `openspec/changes/archive/2026-05-10-restructure-staging/legacy-HANDSHAKE.md`
- 当前生效的契约决策见 `openspec/changes/archive/2026-05-10-restructure-staging/{proposal,design,specs}.md`
