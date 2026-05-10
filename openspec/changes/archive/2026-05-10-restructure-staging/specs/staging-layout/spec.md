## ADDED Requirements

### Requirement: episodes/ 容器目录

所有 episode SHALL 位于 `astral-pipeline/episodes/` 子目录下（即 `astral-pipeline/episodes/<id>/`），而非直接位于 `astral-pipeline/<id>/`。这将 episode 与 staging 自身的配置（`schemas/`、`.bin/`、`.templates/`、文档、`openspec/` 等）从根目录分离，避免根目录信号噪音。

#### Scenario: 新 episode 一律建在 episodes/ 下
- **WHEN** 通过 `.bin/new-episode mldtree04` 创建新 episode
- **THEN** 创建的路径是 `astral-pipeline/episodes/mldtree04/`
- **AND** 不在 `astral-pipeline/mldtree04/` 创建

#### Scenario: 消费方双路径回退（迁移兼容）
- **WHEN** astral-video 等消费方解析 `PIPELINE_ROOT` 下某 id 的实际路径
- **THEN** 优先查找 `<root>/episodes/<id>/`；找不到时 fallback 到 `<root>/<id>/`（兼容尚未迁移的老 episode）
- **AND** 找到后将该路径作为该 id 的实际目录用于后续读取

#### Scenario: 老 episode 保留兼容
- **WHEN** 已存在的 `astral-pipeline/mldtree03/`（在 episodes/ 引入前创建）尚未迁移
- **THEN** 现有所有消费流程仍能正常工作（通过双路径 fallback）
- **AND** 不强制立即迁移；迁移可由用户在闲时手工 `mv mldtree03 episodes/mldtree03` + 重建下游 symlink

### Requirement: 单 episode 目录结构

每个 `astral-pipeline/episodes/<id>/` 目录 SHALL 遵循固定子目录布局：`raw/`、`overlay/`、`publish/`，加上根级文件 `manifest.json` 和 `output.json`（成品就绪后写入）。

#### Scenario: 创建 episode 时建立完整结构
- **WHEN** 通过 `.bin/new-episode` 创建 `mldtree04/`
- **THEN** 立即存在以下子目录：`episodes/mldtree04/raw/{doc,script,tts,recording}/`、`episodes/mldtree04/overlay/`、`episodes/mldtree04/publish/`
- **AND** 立即存在 `episodes/mldtree04/manifest.json`
- **AND** `episodes/mldtree04/output.json` 在视频首次成功渲染前不存在

### Requirement: raw/ 子目录归属

`<id>/raw/` 下的子目录 SHALL 各有唯一写入方：`raw/doc/` 由 script-agent-harness 写、`raw/script/` 由 script-agent-harness 写、`raw/tts/` 由 tts-agent-harness 写、`raw/recording/` 由 ai-engineer-roadmap 写。任何项目 MUST NOT 写入非自己负责的子目录。

#### Scenario: 跨方写入被禁止
- **WHEN** astral-video 尝试写 `<id>/raw/script/something.json`
- **THEN** 此操作违反契约，code review 应拒绝；运行时不强制（文件系统层面无锁）
- **AND** 文档（README）和 schemas 中明确标注归属

#### Scenario: 一致性 lint 工具
- **WHEN** 运行 `.bin/status <id> --lint`（可选扩展）
- **THEN** 检测 raw/ 子目录中是否含明显属于其他方的文件（基于命名约定）

### Requirement: append-only 心智

`raw/` 下的产物在生命周期内 SHALL 视为"append-only"——上游可重写整个产物（覆盖式 export），但 MUST NOT 部分修补。覆盖式重写时 MUST 使用 `.tmp` → `rename` 原子写。

#### Scenario: 上游重导整个 script
- **WHEN** script-harness 重新生成 `raw/script/script.json`
- **THEN** export 流程写 `raw/script/script.json.tmp` 后 `rename` 替换原文件
- **AND** 不允许在原文件上做 in-place 编辑

### Requirement: 派生层与覆盖层分离

`<id>/overlay/` SHALL 仅由消费方（主要是 astral-video）写入，包含 last-mile 微调文件（如 `subtitles.patch.json`、`timing.tweaks.json`）。overlay 文件存在 MUST NOT 触发任何 raw/ 重生（如 tts 重跑）。

#### Scenario: video 端字幕微调
- **WHEN** astral-video 在 overlay/ 写 `subtitles.patch.json` 修改第 3 段字幕文本
- **THEN** raw/tts/*.wav 不变、raw/tts/durations.json 不变
- **AND** 渲染时按 `merge(raw, overlay)` 协议生效新字幕

### Requirement: 二进制大件不入 staging

`<id>/` 内 SHALL NOT 直接存放大于 1MB 的二进制文件（mp4、wav、png 等）作为长期产物。例外：tts-harness 写的 `raw/tts/*.wav` 因下游 symlink 消费需求保留；其他二进制产物（如成品视频）必须通过 `output.json` 引用。

#### Scenario: 成品视频归属
- **WHEN** astral-video 渲染完成 `final.mp4`
- **THEN** mp4 文件留在 astral-video 项目（或对象存储）
- **AND** 在 `<id>/output.json` 写入 `{"video": {"path": "...", "sha256": "...", "duration_s": ...}}`
