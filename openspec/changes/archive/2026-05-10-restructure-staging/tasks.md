## 1. P0 — series 白名单收口（Week 1）

- [x] 1.1 在 `astral-pipeline/schemas/` 创建 `series.json`，迁移现有 11 个系列条目（meta/flash/brief/show/run/core/report/agui/ml/dl/llm），每项含 `name/naming/writers/enabled` 字段
- [x] 1.2 在 `astral-pipeline/schemas/` 创建 `series.schema.json`（JSON Schema 校验上面文件结构）
- [x] 1.3 写 `astral-pipeline/.bin/lint-series` 脚本：用 schema 校验 series.json 自身合法
- [x] 1.4 在 `script-agent-harness/web/lib/episode-id.ts` 增加 `loadSeriesFromPipeline()` 函数，优先读 `~/projects/astral-pipeline/schemas/series.json`，失败时回退到内置硬编码白名单并 console.warn
- [x] 1.5 在 `script-agent-harness/scripts/export-to-pipeline.js` 同样改造（共享 episode-id.ts 逻辑或复制）
- [x] 1.6 在 `astral-video/src/v2/scripts/scaffold-v2.js` 第 59 行白名单常量改为运行时从 `pipeline/schemas/series.json` 读取，失败时回退
- [x] 1.7 在三方各自跑一次 id 校验单元测试，确保新旧路径行为一致
- [ ] 1.8 提交 3 个独立 PR（pipeline + script-harness + video），先合 pipeline，再合 script-harness，最后合 video

## 2. P1 — `episodes/` 容器 + `.bin/new-episode` 统一入口（Week 1）

- [x] 2.1 在 `astral-pipeline/` 创建空 `episodes/` 子目录（含 `.gitkeep`），作为今后所有 episode 的容器
- [x] 2.2 改 `script-agent-harness/scripts/export-to-pipeline.js`：写入路径从 `<PIPELINE_ROOT>/<id>/` 改为 `<PIPELINE_ROOT>/episodes/<id>/`（新创建的 episode）；老 episode 已存在于根目录的不动
- [x] 2.3 改 `astral-video/tools/workbench-next/lib/server/paths.ts`（或对应 PIPELINE_ROOT 解析点）：实现双路径回退函数 `resolveEpisodePath(root, id)` —— 优先 `<root>/episodes/<id>/`，找不到时 fallback `<root>/<id>/`；下游所有读取走此函数
- [x] 2.4 改 `astral-video/src/v2/scripts/scaffold-v2.js`：扫描 episode 时同时考虑 `episodes/` 子目录与根目录（合并清单去重）
- [x] 2.5 验证：在根目录与 `episodes/` 各放一个测试 episode，确认两端都能被消费；`episodes/` 优先级高
- [x] 2.6 在 `astral-pipeline/.templates/empty-episode/` 建模板：`raw/{doc,script,tts,recording}/.gitkeep`、`overlay/.gitkeep`、`publish/.gitkeep`、`manifest.json`（占位，仅含 `schema_version`、空 `raw`、空 `consistency`）
- [x] 2.7 写 `astral-pipeline/.bin/new-episode` 脚本（Node.js，以 shebang 可执行）：
  - [x] 2.7.1 解析 `<id>` 参数 + `--offline` 标志
  - [x] 2.7.2 调用共享 id 校验函数（用 `schemas/series.json`）
  - [x] 2.7.3 拷贝 `.templates/empty-episode/` 到 `episodes/<id>/`（**注意路径**）
  - [x] 2.7.4 用 `<id>` 填充 `manifest.json` 的 `episode` 字段
  - [x] 2.7.5 非 `--offline` 时 HTTP POST 到 `script-harness/api/episodes`，处理失败为非致命错误（写 `pending_actions`）
  - [x] 2.7.6 输出"created" + 摘要
- [x] 2.8 写 `astral-pipeline/.bin/status` 脚本：用双路径 lookup 找到 `<id>/manifest.json`，人类可读展示 raw 段、consistency、pending_actions、output 状态
- [ ] 2.9 在三方 README 加入"推荐用 `.bin/new-episode` 创建新 episode"提示（不强制旧入口失效）
- [ ] 2.10 端到端测试：用 `.bin/new-episode tutorial01` 创建（先在 series.json 加 `tutorial`），验证 `episodes/tutorial01/` 骨架 + script-harness API 都触发

## 3. P2 — publish/ 收口（Week 2）

- [x] 3.1 设计 `<id>/publish/` 目录布局：`platforms/{douyin,xiaohongshu,bilibili,youtube,wechat_channels}.json`、`cover.json`、`control.json`
- [x] 3.2 写 `astral-pipeline/schemas/publish.schema.json`（含 platform schema、cover schema、control schema）
- [x] 3.3 改 `script-agent-harness/scripts/export-to-pipeline.js`：读 `episodes/<id>/publish.json`，拆解为 `pipeline/<id>/publish/platforms/*.json` + `cover.json`，原子写
- [x] 3.4 改 `astral-video/scripts/build-publish.sh` 第 ~50 行：从 `pipeline/<id>/publish/` 读取（替代原来读 video 自己 episode 目录的路径）
- [x] 3.5 验证 build-publish.sh 输出与改造前对一个已发布 episode（如 mldtree03）做 diff，确认字节一致
- [x] 3.6 增加 `<id>/publish/control.json` 支持，`build-publish.sh` 在 do_not_publish=true 时退出非 0
- [x] 3.7 文档：在 staging README 加入 publish/ 子目录章节

## 4. P3 — manifest.json + output.json（Week 3）

- [x] 4.1 写 `astral-pipeline/schemas/manifest.schema.json`（含 raw/consistency/pending_actions 等段定义）
- [x] 4.2 写 `astral-pipeline/schemas/output.schema.json`（video.path/sha256/duration_s + rendered_at + renderer_version）
- [x] 4.3 改 `script-agent-harness/scripts/export-to-pipeline.js`：写完 raw/script/ 后用 read-modify-write 更新 `manifest.raw.script` 段（version + sha256），原子替换
- [x] 4.4 改 `tts-agent-harness` 写完 raw/tts/ 后类似更新 `manifest.raw.tts`（含 based_on_script_sha）—— 唯一需要触碰 tts-harness 的改动
- [x] 4.5 改 `ai-engineer-roadmap` 录屏写完后更新 `manifest.raw.recording`
- [x] 4.6 写 `astral-pipeline/.bin/recompute-consistency` 脚本：扫描 `<id>/manifest.json` 重算 consistency 段（tts_stale 等），支持 `<id>` 单独重算或 `--all` 批量重算
- [x] 4.7 改 `astral-video` 渲染完成后写 `<id>/output.json`（path、sha256、duration_s、rendered_at、renderer_version）
- [x] 4.8 改 `.bin/status` 利用 manifest + output.json 增强输出（首版即支持：raw 段表格化展示、consistency 段、pending_actions 列表、output.json 引用展示，双路径回退兼容老 episode）
- [ ] 4.9 端到端验证：跑完 mldtree04 全流程，确认 manifest 各段都正确填写，consistency 标记符合预期

## 5. P4 — overlay/ 派生层（Week 3）

- [x] 5.1 写 `astral-pipeline/schemas/overlay.schema.json`：定义 subtitles.patch.json 和 timing.tweaks.json 的结构（patches 数组 + segment_id/field/value 三元组），用 oneOf 区分两种 kind
- [x] 5.2 在 `astral-video/src/v2/engine/director/` 增加 `apply-overlay.ts` 模块：实现 `mergeOverlay(rawSubtitles, patches)` 确定性合并函数
- [x] 5.3 在 `make-renderers.tsx` 或 `build-context.ts` 中调用 mergeOverlay，让渲染时使用合并后的 subtitles（而非直接读 raw/tts/subtitles.json）
- [x] 5.4 实现 unknown segment_id 跳过 + 日志告警逻辑
- [x] 5.5 在 `astral-video/tools/workbench-next/` 加一个最小 UI：列出当前 overlay 文件、允许编辑 subtitles.patch.json
- [x] 5.6 验证：手工创建 `<id>/overlay/subtitles.patch.json` 改第 3 段字幕，渲染输出确认字幕变化但 wav/durations 未触发重生
- [x] 5.7 验证可丢弃：`rm -rf <id>/overlay/*` 后渲染仍成功
- [x] 5.8 写 `.bin/clear-overlay <id>` 工具方便清空 overlay（支持 `--dry-run` 预览）

## 6. P5 — HANDSHAKE.md 删除 + README 重写（Week 1，可与 P0/P1 并行）

- [x] 6.1 写新 `astral-pipeline/README.md`（≤ 80 行）：项目角色（data + control plane）、目录速览、三方写入归属、`.bin/` 入口列表、schemas 索引、"如需历史决策溯源 → git log"
- [x] 6.2 在 README 顶部加显式说明："本仓不再维护文字协议；契约由 schemas/ 机器可读 + 各端 export 脚本承载"
- [x] 6.3 删除 `astral-pipeline/HANDSHAKE.md`（已快照到 `openspec/changes/restructure-staging/legacy-HANDSHAKE.md`；astral-pipeline 不是独立 git 仓，git history 保护不可用，故采用快照方案）
- [~] 6.4 全局搜索三方代码 + 文档中对 HANDSHAKE.md 的引用，更新为 README 或 schemas 路径
  - [x] 搜索完成：57 处引用分布在 script-harness (18) / astral-video (19) / tts-harness (14) / ai-engineer-roadmap (6)
  - [ ] **更新待用户主导**（跨仓 Edit）。建议优先级：
    - 高：4 个仓的 `CLAUDE.md`（每个仅 1-2 处引用）
    - 中：`script-harness/CONTRACT.md`、`script-harness/BACKLOG.md`、`script-harness/scripts/export-to-pipeline.js` 头注释、`script-harness/web/lib/episode-id.ts` 头注释、`tts-harness/docs/023-pipeline-integration-design.md`、`ai-engineer-roadmap/01-ML/_3-script-guide.md` + `_8a-pipeline-sync-guide.md`
    - 不动：`astral-video/tools/workbench/TECH-REVIEW.md` (17 处) + `tts-harness/.planning/p7-fix/*.md` (8 处)——历史评审/设计快照，时点性文档保留
- [x] 6.5 检查 ~/.claude/CLAUDE.md 与 astral-pipeline/CLAUDE.md 中的 HANDSHAKE 引用，同步更新（astral-pipeline/CLAUDE.md 已重写；~/.claude/CLAUDE.md 经检查无 HANDSHAKE 引用）

## 7. 验收

- [ ] 7.1 跑通端到端：`.bin/new-episode tutorial99` → script-harness 编辑 → export → tts 跑 → astral scaffold → 渲染 → output.json 写 → 手工加 overlay 改字幕 → 重渲 → 字幕生效且 tts 未重跑
- [ ] 7.2 验证 manifest.consistency.tts_stale 标记在 script 重导后正确变 true
- [ ] 7.3 验证 series.json 改动后所有三方在重启后采用新白名单
- [ ] 7.4 验证 `.bin/status <id>` 在各种状态（空、半成品、全齐、tts 陈旧）下输出符合预期
- [ ] 7.5 git log 确认所有 6 个 PR 独立、按推荐顺序合并
- [ ] 7.6 确认 tts-agent-harness 仅有 P3.4 一处改动（manifest 写入段）
- [ ] 7.7 在 staging README 顶部宣布"本变更已落地；旧 HANDSHAKE.md 见 git history commit `<sha>`"

## 8. 老 episode 软迁移到 `episodes/`（无强制时间表）

- [x] 8.1 列出根目录所有现有 episode（`ls astral-pipeline/ | grep -E '^[a-z]+[0-9]+$'`），写入 `episodes/.migration-todo.txt`
- [x] 8.2 对每个老 episode：`mv <id> episodes/<id>` + 重建 astral-video 端的 symlink（`astral scaffold <id> --resync-sources`）+ 验证下游渲染仍通过
- [ ] 8.3 当 `.migration-todo.txt` 全部清空后，可在某个版本移除 `resolveEpisodePath` 中的根目录 fallback（独立 PR）
- [ ] 8.4 此阶段无 deadline；新 episode 一律在 `episodes/`，老 episode 按需慢慢迁
