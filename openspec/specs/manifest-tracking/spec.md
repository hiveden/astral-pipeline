### Requirement: manifest.json 存在性与 schema

每个 `<id>/manifest.json` SHALL 存在且符合 `schemas/manifest.schema.json` 定义。最小必含字段：`episode`（id 字符串）、`schema_version`（字符串）、`raw`（对象）、`consistency`（对象）。

#### Scenario: schema 校验
- **WHEN** 任何工具读取 manifest.json
- **THEN** 应能用 `schemas/manifest.schema.json` 做 JSON Schema 校验
- **AND** 缺少必需字段时校验失败并报告缺失字段

### Requirement: raw 段版本与指纹

每个 raw/ 子产物（script、tts、recording）写入方 SHALL 在写入完成后更新 manifest 中对应 `raw.<sub>` 段，包含 `version`（ISO 时间戳）、`sha256`（产物指纹）字段。tts 段额外 MUST 含 `based_on_script_sha`（生成时所基于的 script sha256）。

#### Scenario: script 写入后更新 manifest
- **WHEN** script-harness 通过 export-to-pipeline.js 写完 `raw/script/`
- **THEN** 同一原子 export 流程更新 `manifest.raw.script` 为 `{ "version": "<ISO>", "sha256": "<hex>" }`
- **AND** sha256 由 script.json 内容计算

#### Scenario: tts 写入后记录依赖
- **WHEN** tts-harness 基于当前 script.json 生成完所有 wav
- **THEN** 同流程更新 `manifest.raw.tts` 为 `{ "version": "<ISO>", "sha256": "<hex>", "based_on_script_sha": "<当时 script sha>" }`

### Requirement: consistency 标记

manifest 的 `consistency` 段 SHALL 表达跨产物一致性。当 `raw.tts.based_on_script_sha != raw.script.sha256` 时 MUST 设 `consistency.tts_stale = true` 并附 `tts_stale_reason` 字符串和 `actionable` 字符串建议下游处理方式。

#### Scenario: script 变更后 tts 变陈旧
- **WHEN** script 重导致 sha 改变，但 tts 未重跑
- **THEN** `.bin/status` 或显式 lint 工具更新 `consistency.tts_stale = true`
- **AND** `consistency.actionable` = "下游可用 overlay 微调字幕，无需重跑 tts"

#### Scenario: 全部一致
- **WHEN** 所有 raw 段 sha 互相对齐
- **THEN** `consistency.tts_stale = false`
- **AND** 不出现 `tts_stale_reason` 字段

### Requirement: 段隔离写入

各方 SHALL 仅修改自己负责的 manifest 段：script-harness 写 `raw.script`、tts-harness 写 `raw.tts`、ai-engineer-roadmap 写 `raw.recording`、staging `.bin/` 工具异步写 `consistency` 与 `pending_actions`。任何写入 MUST 用 `.tmp` → `rename` 原子替换整个 manifest.json，但 MUST 在 read-modify-write 中保留其他段不变。

#### Scenario: tts 写入不影响 script 段
- **WHEN** tts-harness 更新 manifest 时，script 段已存在
- **THEN** 写入后 `manifest.raw.script` 内容与写入前完全一致
- **AND** 仅 `manifest.raw.tts` 段被更新

### Requirement: pending_actions 字段

manifest SHALL 支持可选的 `pending_actions` 数组字段，记录"应当但尚未发生"的跨方动作（例如离线模式创建 episode 后 script-harness 尚未拉齐）。任何方完成对应动作后 MUST 从数组移除该项。

#### Scenario: 离线创建后 script-harness 补齐
- **WHEN** episode 用 `--offline` 创建，manifest 含 `pending_actions: ["script-harness:create"]`
- **AND** 用户后续在 script-harness 上完成创建
- **THEN** script-harness 读 manifest 检测此项 → 完成创建 → 从数组移除该项
