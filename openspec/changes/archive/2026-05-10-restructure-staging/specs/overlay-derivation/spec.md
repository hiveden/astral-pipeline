## ADDED Requirements

### Requirement: overlay 目录归属

`<id>/overlay/` SHALL 由消费方（主要是 astral-video）写入，包含基于 raw/ 产物的 last-mile 派生覆盖文件。overlay 文件 SHALL 符合 `schemas/overlay.schema.json` 定义。

#### Scenario: video 端创建 overlay
- **WHEN** astral-video 工作台用户决定调整某句字幕
- **THEN** 写入 `<id>/overlay/subtitles.patch.json`
- **AND** 不修改 `<id>/raw/tts/subtitles.json`

### Requirement: subtitles.patch.json schema

`subtitles.patch.json` SHALL 是包含 `patches` 数组的对象。每个 patch MUST 含 `segment_id`（对应 script.json 中的段 id）、`field`（被覆盖的字段名，如 `text`、`start_ms`、`end_ms`）、`value`（新值）。

#### Scenario: 单条字幕文本覆盖
- **WHEN** patch 为 `{ "segment_id": "s3", "field": "text", "value": "新字幕文本" }`
- **THEN** 渲染时第 s3 段字幕文本显示为 "新字幕文本"
- **AND** s3 段对应的 wav、duration 完全不变

#### Scenario: 时序微调
- **WHEN** patch 为 `{ "segment_id": "s4", "field": "start_ms", "value": 12300 }`
- **THEN** 渲染时第 s4 段字幕起始时间向后挪到 12300ms
- **AND** wav 播放时机不变（时序仅影响字幕显示，不影响音频）

### Requirement: merge 协议

astral-video 渲染管线 SHALL 在读取 raw/ 产物后、生成最终输出前应用 overlay/ 中的 patches。合并算法 MUST 是确定性的：相同 raw + 相同 overlay → 相同结果。当 overlay 引用了 raw 中不存在的 segment_id 时，MUST 跳过该 patch 并在日志中告警，不抛错。

#### Scenario: 确定性合并
- **WHEN** 用相同 raw + overlay 渲染两次
- **THEN** 两次输出（包括字幕、时序）字节一致

#### Scenario: 引用不存在的 segment
- **WHEN** overlay 含 patch `{ "segment_id": "s99", "field": "text", "value": "..." }`，但 raw script 只有 s1-s5
- **THEN** 渲染继续，生成不含 s99 改动的视频
- **AND** 日志输出 "warn: overlay patch references unknown segment_id s99, skipped"

### Requirement: overlay 不触发 raw 重生

任何 overlay 文件的存在、修改、删除 MUST NOT 触发 raw/ 任何子产物重新生成（特别是 tts 重跑）。overlay 是渲染时叠加层，与 raw 生成阶段完全解耦。

#### Scenario: 大量 overlay 不影响 tts
- **WHEN** 用户在 overlay/ 写入多个 patches 修改字幕
- **THEN** tts-harness 不被触发
- **AND** raw/tts/*.wav 文件 mtime 不变

### Requirement: overlay 可丢弃

overlay/ 中的所有文件 SHALL 视为"可丢弃"——删除整个 overlay/ 目录后，渲染仍能基于 raw/ 产出有效（虽未微调）的视频。这保证了 overlay 不是关键路径数据。

#### Scenario: 清空 overlay 后渲染
- **WHEN** 用户 `rm -rf <id>/overlay/*` 后触发渲染
- **THEN** 渲染成功，输出基于 raw/ 的视频（字幕为 raw 原版）
- **AND** 不报错
