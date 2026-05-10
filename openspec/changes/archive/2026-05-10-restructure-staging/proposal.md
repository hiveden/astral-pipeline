## Why

astral-pipeline 当前的"四方契约共享 staging 区"心智已与现实脱节：HANDSHAKE.md 文字协议过时（Agent 跨项目直接读代码即可推断契约，文档反而 stale），而 staging 真实角色其实是 astral 系列项目的 **data + control plane**（事实中心 + 治理入口）。同时已显现 5 个真痛点（series 白名单 3 处维护、publish 字段散落、字幕微调成本不对称回滚缺口、新 episode 创建无统一入口、export 非事务），这些都不是想象问题。本变更将 staging 从"被动文件夹"升级为"主动事实中心"，并删除冗余协议文档。

## What Changes

- **新增**：`episodes/` 子目录作为所有 episode 的容器，将 episode 与 staging 自身的配置（`schemas/`、`.bin/`、`.templates/`、`README.md`、`openspec/` 等）从根目录分离，避免根目录信号噪音
- **新增**：`schemas/series.json` 全局唯一系列白名单（取代 script-harness/web/lib/episode-id.ts、scripts/export-to-pipeline.js、astral-video/src/v2/scripts/scaffold-v2.js 三处各自维护）
- **新增**：`schemas/manifest.schema.json`、`schemas/overlay.schema.json` 机器可读契约
- **新增**：`.bin/new-episode <id>` 跨项目统一创建入口（包含 id 校验、`episodes/<id>/` 骨架、调 script-harness POST /api/episodes）
- **新增**：`.bin/status <id>` 读 manifest 看 episode 状态
- **新增**：`.templates/empty-episode/` new-episode 骨架模板
- **新增**：每个 `episodes/<id>/overlay/` 派生层目录（含 subtitles.patch.json、timing.tweaks.json 等）—— 解锁"video 端 last-mile 微调不需重跑 tts"
- **新增**：每个 `episodes/<id>/publish/` 发布元信息全局唯一目录（platforms/*.json + cover.json）
- **新增**：每个 `episodes/<id>/manifest.json` 状态/版本/指纹/consistency 标记
- **新增**：每个 `episodes/<id>/output.json` 成品引用（路径 + sha + 时长,不存二进制本身）
- **新增**：每个 `episodes/<id>/raw/` 子目录约定（包裹现有 doc/ script/ tts/ recording/，明确 append-only 心智）
- **修改**：astral-video 渲染管线增加 `merge(raw, overlay)` 逻辑
- **修改**：script-harness export-to-pipeline.js 多推 publish.json 到 staging；写入路径迁移到 `episodes/<id>/`
- **修改**：astral-video build-publish.sh 改读 staging publish/；PIPELINE_ROOT 解析支持 `episodes/<id>/` 优先 + 根目录回退（兼容老 episode）
- **修改**：三方代码改读 schemas/series.json 取代各自硬编码白名单
- **删除**：HANDSHAKE.md（由顶层 README.md 索引 + schemas/ 机器可读契约联合替代）
- **不变**：tts-harness 完全不动（仅 P3 写 manifest 一行版本号；写入路径迁移由 staging 侧脚本协调，tts 自身代码不改）
- **不变**：astral-video 现有 webpack.Context 自扫机制保留（仅扫描根改为优先 `episodes/`）
- **不变**：mock-missing.js 留 video repo（已工作良好）
- **迁移**：现有 30+ 根目录 episode 软迁移——新 episode 一律建到 `episodes/<id>/`，老 episode 留根目录可继续工作；闲时手工 `mv` + 重建 symlink

## Capabilities

### New Capabilities

- `series-registry`: 系列白名单的单一事实源、id 校验规则、扩展机制
- `episode-lifecycle`: 新 episode 创建的统一入口、跨项目协调、骨架模板管理
- `staging-layout`: 顶层 `episodes/` 容器、单 episode 目录结构（raw/overlay/publish/manifest/output）、各子目录归属、append-only 与派生层心智
- `manifest-tracking`: 各产物版本指纹、consistency 一致性标记、下游可观察状态
- `overlay-derivation`: video 端 last-mile 派生层（字幕/时序微调）、merge(raw, overlay) 协议、上游不知情的下游覆盖
- `publish-metadata`: 跨平台发布元信息全局唯一存储（5 平台 + cover）
- `output-reference`: 成品视频引用层（路径 + sha + 时长，避免二进制大件入 staging）

### Modified Capabilities

(空 —— 当前 openspec/specs/ 为空，无已有 capability 可修改)

## Impact

**直接修改的代码库**：

- `astral-pipeline/`（本仓）：新增 `episodes/` 容器、`schemas/`、`.bin/`、`.templates/`，重构每个 `episodes/<id>/` 子目录约定，删 HANDSHAKE.md，重写 README.md
- `script-agent-harness/`：episode-id.ts 改读 series.json；export-to-pipeline.js 改读 series.json + 多推 publish.json + 写 manifest 段
- `astral-video/`：scaffold-v2.js 改读 series.json；build-publish.sh 改读路径；渲染管线（src/v2/engine/）增加 overlay merge 逻辑；写 manifest 段

**完全不动**：

- `tts-agent-harness/`：唯一接触是 P3 写 manifest 一行版本号（非阻塞）
- `ai-engineer-roadmap/`：录屏写入流程不变

**阻塞性评估**：0 阻塞性重构。所有阶段均向后兼容、可独立 PR、可在任意阶段停下。详见 design.md "Migration Strategy"。

**用户认知**：跨项目操作的 Agent（Claude Code 等）从此应将 astral-pipeline 视为"全局事实库 + 治理入口"，不再视为"被动产物 staging"。
