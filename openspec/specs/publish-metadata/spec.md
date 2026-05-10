### Requirement: publish/ 目录归属与结构

每个 `<id>/publish/` SHALL 是发布元信息的全局唯一存储，包含 `platforms/` 子目录（每个支持平台一个 JSON 文件）和 `cover.json`。当前支持的平台 SHALL 包含 `douyin`、`xiaohongshu`、`bilibili`、`youtube`、`wechat_channels` 五项。

#### Scenario: publish 目录布局
- **WHEN** 检查任意已发布 episode 的 publish 目录
- **THEN** 存在 `publish/platforms/douyin.json`、`publish/platforms/xiaohongshu.json`、`publish/platforms/bilibili.json`、`publish/platforms/youtube.json`、`publish/platforms/wechat_channels.json` 中的至少一项
- **AND** 存在 `publish/cover.json`

### Requirement: 平台元信息字段

每个 `publish/platforms/<platform>.json` SHALL 至少包含 `title`、`description`、`tags`（字符串数组）字段。各平台可有自己额外的字段（如 youtube 可加 `category`、bilibili 可加 `partition`）。

#### Scenario: 最小可发布字段
- **WHEN** 读取 `publish/platforms/youtube.json`
- **THEN** 至少含 `{ "title": "...", "description": "...", "tags": [...] }`

### Requirement: cover.json 结构

`<id>/publish/cover.json` SHALL 含 `main_title`（封面主标题）、`subtitle`（副标题，可选）、`metrics`（封面上的指标卡片数据，对象数组，可选）字段。

#### Scenario: cover 数据
- **WHEN** 读取 `publish/cover.json`
- **THEN** 含 `{ "main_title": "...", "subtitle": "...", "metrics": [{"label": "...", "value": "..."}, ...] }`

### Requirement: 写入归属：script-harness 主写

`publish/` 中所有文件 SHALL 由 script-harness 通过 `export-to-pipeline.js` 流程写入。script-harness `episodes/<id>/publish.json` 是源头，export 时拆解为 `publish/platforms/*.json` + `publish/cover.json`。其他项目 MUST NOT 直接写入 `publish/`，但可读消费。

#### Scenario: script-harness export 推送 publish
- **WHEN** script-harness 运行 export-to-pipeline.js 且 `episodes/<id>/publish.json` 存在
- **THEN** export 流程把 publish.json 内的 platforms 段拆成 `pipeline/<id>/publish/platforms/*.json`，cover 段写到 `pipeline/<id>/publish/cover.json`
- **AND** 各文件用 `.tmp` → `rename` 原子写

#### Scenario: video 仅消费
- **WHEN** astral-video 的 `build-publish.sh` 准备发布包
- **THEN** 只读 `pipeline/<id>/publish/`，绝不写入

### Requirement: do_not_publish 控制

`publish/` SHALL 支持顶层 `publish/control.json` 含 `do_not_publish` 布尔字段。下游发布工具 MUST 在发布前检查此标志，为 `true` 时拒绝发布并退出。

#### Scenario: 阻止发布
- **WHEN** `<id>/publish/control.json` 含 `{ "do_not_publish": true }` 且用户尝试发布
- **THEN** 发布工具退出，输出 "blocked by control.json: do_not_publish=true"
- **AND** 退出码非 0

#### Scenario: 默认允许
- **WHEN** `control.json` 不存在或 `do_not_publish` 字段缺失
- **THEN** 发布工具继续正常流程
