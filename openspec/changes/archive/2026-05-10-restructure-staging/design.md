## Context

astral-pipeline 在 2026-04 引入，原意是给四个 agent 项目做"产物原子缓冲层"，由 HANDSHAKE.md（1435 行 / 63KB）规定四方契约。运行半年后两个事实浮出来：

1. **协议层冗余**：Agent 跨项目能直接读代码推断契约（每个 export-to-pipeline.js / scaffold-v2.js 就是活契约），HANDSHAKE.md 文档反而 stale
2. **数据层欠缺事实中心能力**：series 白名单 3 处维护、publish 字段散落、字幕微调成本不对称回滚缺口、新 episode 无统一入口、export 非事务

通过 3 轮并发 agent 调研已**实证**：

- astral-video 是纯 symlink 单向只读消费方（0 回写）
- script-harness 已有 `episodes/<id>/publish.json` 完整 5 平台元信息
- video 端 `mock-missing.js` 写 `.cache/mock/` 不污染 pipeline，已工作良好
- video 端 0 行代码读 doc/（symlink 进了但未消费），所以"扩 doc 内容"是伪需求
- series 白名单当前在 episode-id.ts、export-to-pipeline.js、scaffold-v2.js 三处各自维护

## Goals / Non-Goals

**Goals:**

- 把 staging 升级为 astral 系列项目的 **data + control plane**：事实中心 + 治理入口
- 解决 5 个真痛点（series 白名单收口、publish 收口、派生层、统一创建入口、状态可观察）
- 0 阻塞性重构 —— 所有阶段向后兼容、可独立 PR、可在任意阶段停下
- tts-harness 完全不动（red line）
- 删除 HANDSHAKE.md 减心智负担，由 README 索引 + schemas/ 机器契约联合替代

**Non-Goals:**

- 不收口 mock 机制（已工作良好，留 video repo）
- 不扩 doc/ 原料内容（video 端 0 消费，假设证伪）
- 不做索引/视图层（video webpack.Context 已自给自足）
- 不做版本快照系统（无下游需求）
- 不引入数据库或服务（保持文件系统 + JSON 契约心智）
- 不做并发写锁机制（当前单 agent 写单 episode 的实际工作流不需要）

## Decisions

### D1：staging 形态 = 文件系统 + JSON 契约 + 跨项目脚本

**选项**：
- A: 文件系统 + JSON（现状强化版） ✅
- B: SQLite/数据库
- C: HTTP API + 内存服务

**采纳 A**。理由：
- 现状已是文件系统，迁移成本最低
- Agent 可读性最高（直接 ls / cat / jq）
- symlink 机制天然支持下游热刷新
- 跨项目脚本（`.bin/`）作为 control plane 比 HTTP 服务轻量

### D2：raw/ vs overlay/ 分层 = "成本不对称回滚"驱动

**选项**：
- A: 全产物扁平存放（现状）
- B: raw/ 上游 + overlay/ 下游派生 ✅
- C: 三层 raw/ + derived/ + final/

**采纳 B**。理由：

字幕微调若回上游改 script，tts 必须全量重跑（贵：API/GPU 调用）；但 video 端基于已生成 wav 改字幕文本/时序成本极低。**修改是否回流上游 = 是否影响贵产物（wav/recording）**。

```
渲染时：
  final = merge(raw, overlay)
不变量：永不因 overlay 文件存在/变化触发 raw 重生
```

### D3：series 白名单收口 → schemas/series.json

**选项**：
- A: 接受三处维护现状
- B: 抽到 staging schemas/（机器可读）✅
- C: 抽到 npm package（共享库）

**采纳 B**。理由：
- 三处维护已确认是真痛点
- npm package 引入构建依赖，不符合"轻量心智"
- staging 已是三方共同祖先，schemas/ 机器可读不过时

迁移期允许"白名单源不一致"窗口，但不会运行时崩（仅校验严松不齐）。

### D4：publish/ 收口 → script 主写、video 主读

**选项**：
- A: 现状（script-harness 单方维护，video 不管）
- B: staging 收口、script 主写、video 主读 ✅
- C: 双向写 + 冲突解决

**采纳 B**。理由：

调研显示 video 端**当前根本不维护发布字段**（只有 build-publish.sh 打包，meta.json 只有视觉封面参数）。所以"两端对等写"是想象出来的需求。保持 script 主写 + video 主读，未来 video 端 workbench 想编辑时再加 PUT API。

```
script-harness/episodes/<id>/publish.json
  └─ export-to-pipeline.js 多推一份
     └─ pipeline/<id>/publish/{platforms,cover}.json
        └─ video build-publish.sh 改读
```

### D5：staging 不存二进制 → output.json 引用层

**选项**：
- A: 二进制留各 repo（现状）
- B: 二进制全收口 staging
- C: staging 存 manifest + 引用，二进制留生成方 ✅

**采纳 C**。理由：
- B 让 staging 膨胀（wav/mp4 巨大）
- A 让"事实中心"叙事破裂（不知道成品在哪）
- C 兼得：`output.json` 存路径 + sha256 + duration，二进制留 video 项目或对象存储

```jsonc
// <id>/output.json
{
  "video": { "path": "/abs/path/final.mp4", "sha256": "...", "duration_s": 423 },
  "rendered_at": "2026-05-09T14:23:00Z",
  "renderer_version": "astral-video@2026-04-27"
}
```

### D6：manifest.json 担任 consistency 信号

**选项**：
- A: 各产物自带版本字段（散落）
- B: 整 episode 一个 manifest.json 汇总状态 + 一致性标记 ✅
- C: 单独的 changelog.json + diff 历史

**采纳 B**。理由：

git log 已提供 commit 级 diff（免费），不需要 C。但下游需要"一眼看出这个 episode 现在到哪一步、可不可消费、tts 是否过时"。manifest 用 `consistency` 字段把语义吃下去：

```jsonc
{
  "episode": "mldtree03",
  "raw": {
    "script": { "version": "2026-05-09T14:23", "sha": "ab12...", "exported_at": "..." },
    "tts":    { "version": "2026-05-08T10:11", "sha": "cd34...", "based_on_script_sha": "0099..." },
    "recording": { "version": "...", "sha": "..." }
  },
  "consistency": {
    "tts_stale": true,
    "tts_stale_reason": "tts.based_on_script_sha != raw.script.sha",
    "actionable": "下游可用 overlay 微调字幕，无需重跑 tts"
  },
  "schema_version": "1"
}
```

### D7：.bin/ 跨项目脚本 vs 收口在 staging 内 npm

**选项**：
- A: staging 提供独立可执行 bash/node 脚本 ✅
- B: 在每个项目各加 npm script
- C: 抽 npm package 共享

**采纳 A**。理由：
- 三方项目各自技术栈不同（script-harness 是 Next.js、video 是 Remotion、tts 是独立）
- staging 中性、所有 agent 都能直接调用
- bash + node 脚本零依赖
- 体现 staging 的 control plane 角色

### D9：episodes/ 子目录容器 + 软迁移

**选项**：
- A: 现状（episode 与配置平铺根目录）
- B: 加 `episodes/` 子目录容器 ✅
- C: 按系列分子目录（`episodes/ml/dtree/03/`）
- D: 按状态分子目录（`episodes/active/` + `episodes/archive/`）

**采纳 B**。理由：
- A 当前根目录已混杂 30+ episode + `.claude/`、`openspec/`、`README.md`、`CLAUDE.md`、`HANDSHAKE.md`、新加的 `schemas/`、`.bin/`、`.templates/`，`ls` 信号噪音爆炸
- C 路径过深（`mldtree03` 要 `cd episodes/ml/dtree/03/`），破坏当前 id 单串心智，且当前命名 `mldtree03` 已含系列+算法信息，归档收益有限
- D"已发布"状态判定模糊，且用户的"成本不对称回滚"暗示会反复回去重渲，archive 反而是负担
- B 最小改动 + 最大清晰度收益：单层包裹，路径仅多一层 `episodes/`，所有现有约定保持

**软迁移策略**（关键）：
- 新 episode 通过 `.bin/new-episode` 一律建到 `episodes/<id>/`
- 老 episode 留根目录可继续工作
- script-harness `export-to-pipeline.js` 写入新路径 `episodes/<id>/`
- astral-video `PIPELINE_ROOT` 解析双路径回退：优先 `<root>/episodes/<id>/`，找不到时 fallback 到 `<root>/<id>/`
- 闲时手工 `mv <id> episodes/<id>` + 重建下游 symlink；无强制时间表

**结果**：0 阻塞性，迁移期内根目录与 `episodes/` 共存；当所有老 episode 都迁移后可在某个版本移除 fallback。

### D8：删 HANDSHAKE.md，由 README + schemas 替代

**选项**：
- A: 保留 HANDSHAKE.md（现状）
- B: 顶层 README.md 索引 + schemas/ 机器可读契约 ✅
- C: 把 HANDSHAKE 拆成多个小文档

**采纳 B**。理由：
- 文档版协议在 Agent 时代必然过时（代码改文档不改）
- schemas/*.schema.json 被代码引用 = 活文档
- README ≤ 50 行做入口索引 + 设计原则即可
- HANDSHAKE 历史决策（附录 A-O）已无价值（决策已固化在代码里）

## Risks / Trade-offs

- **[Risk] series 白名单迁移期不一致** → Mitigation：迁移期间允许三处源不一致，校验严松不齐不会运行时崩；优先合并 staging 文件 + script-harness（最频繁创建 episode 的端），最后合 video
- **[Risk] overlay merge 逻辑增加 video 端复杂度** → Mitigation：merge 协议在 schemas/overlay.schema.json 强契约定义；提供参考实现；先支持 subtitles.patch.json 一种 overlay，再扩
- **[Risk] manifest.json 写时序** → 多方写入需协调 → Mitigation：每方只写 manifest 自己负责的段（raw.script 段由 script-harness 写、raw.tts 由 tts 写、consistency 段由 staging .bin/ 工具异步计算）；schemas 强契约 + atomic write
- **[Risk] 删 HANDSHAKE.md 后某些历史 agent prompt 找不到** → Mitigation：保留 git history（任何时候 `git show HEAD~N:HANDSHAKE.md` 可恢复）；README 顶部列"如需历史决策溯源，见 git log openspec/changes/restructure-staging/ + 旧 HANDSHAKE 的 commit"
- **[Risk] 跨项目 .bin/ 脚本调 script-harness HTTP API 时 API 不在线** → Mitigation：脚本支持 `--offline` 模式只建 staging 骨架，事后再让 script-harness 拉齐；状态记 manifest 的 `pending_actions` 字段
- **[Trade-off] 0 二进制入 staging** → 优点：staging 轻量；缺点：output.json 路径可能漂移 → 接受，路径漂移由 sha256 兜底（不一致时 status 工具报警）

## Migration Plan

**分 6 阶段（P0–P5），每阶段独立 PR、独立可测、独立可回滚：**

```
Week 1：低风险、纯 staging 内动 + 文档清理
  P0  schemas/series.json + 三处改读
  P1  .bin/new-episode 统一入口
  P5  HANDSHAKE.md 删除 + README 重写

Week 2：验证"加法 + 改一行 path"模式
  P2  publish/ 收口 + export 多推 + build-publish 改路径

Week 3：真改造 + 解锁新能力
  P3  manifest.json + output.json 引用层
  P4  overlay/ 派生层 + video 渲染管线 merge 逻辑
```

**回滚策略**：
- P0–P3 全是加法或单点 path 修改，git revert 即可
- P4 影响 video 渲染管线，回滚需配合 video 项目独立 revert；若 overlay 文件存在但 merge 逻辑被还原，视为"overlay 不生效"（数据安全，无破坏）
- P5 删除 HANDSHAKE.md 在 git history 永远可恢复

**任意阶段停下的边界**：

- 停在 P2：staging 已成"事实中心"（series + publish 收口、统一创建入口、文档清理），P3/P4 等真痛点再做
- 停在 P3：增加状态可观察，但"成本不对称回滚"未解锁，字幕微调仍需回上游重跑 tts
- 完成 P4：全部价值兑现

## Open Questions

下列问题在本变更中**不阻塞**实施，进 design.md 留档，未来按需开新变更解决：

1. **recording/ 治理边界**：当前 ai-engineer-roadmap 单方写 ml/dl/llm 三系列的录屏。其他系列（meta/flash/brief 等）若也需要录屏，归属如何？是否要把 recording 子目录的写入方扩展为多个？
2. **overlay 的"可丢弃"边界**：subtitles.patch.json 算是"可重新生成"的派生，timing.tweaks.json 是否也是？哪些 overlay 必须长寿（人手工调出来的精细参数）、哪些可以丢（机械可重算）？是否在 schemas 标记 `disposable: true|false`？
3. **staging 是否该建 git 仓**：当前 README 说"不进任何 repo"。但若 staging 升级为事实中心，schemas/.bin/.templates/<id>/manifest.json 等小文件值得 git 追踪。是否建独立 git 仓只追小文件 + .gitignore 屏蔽 wav/mp4/png>1MB？还是继续完全本地？
4. **多 agent 并发写同一 `<id>/` 锁机制**：当前是隐式串行（人手工或单 Claude Code 会话）。多个 agent（script-agent + tts-agent）并发写不同子目录已工作良好（互不重叠）；但若两个 agent 同时写 `manifest.json` 同一段 → 是否需要文件锁？目前判断暂不需要（atomic write + 段隔离已够），但需观察。
