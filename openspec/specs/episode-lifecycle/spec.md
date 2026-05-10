### Requirement: 统一创建入口

系统 SHALL 提供 `astral-pipeline/.bin/new-episode <id>` 作为新 episode 创建的唯一推荐入口。该命令 MUST 执行 id 校验、staging 骨架创建、调用 script-harness POST `/api/episodes` 三个步骤。

#### Scenario: 完整创建流程
- **WHEN** 用户运行 `.bin/new-episode mldtree04`
- **THEN** 命令依次：(1) 用 `series-registry` 校验 id；(2) 从 `.templates/empty-episode/` 拷贝建立 `astral-pipeline/mldtree04/`；(3) HTTP POST `http://localhost:<script-harness-port>/api/episodes` body `{"id":"mldtree04"}`
- **AND** 三步全部成功后输出"created"
- **AND** 任一步失败 MUST 报告失败步骤并保留已完成步骤产物（不自动清理）

#### Scenario: 拒绝非法 id
- **WHEN** 用户运行 `.bin/new-episode foo99-v2`
- **THEN** 在第一步 id 校验阶段报错退出
- **AND** 不创建任何 staging 目录
- **AND** 不调用 script-harness API

### Requirement: 离线模式

`.bin/new-episode` SHALL 支持 `--offline` 标志。启用时 MUST 跳过调用 script-harness API，只完成 id 校验 + staging 骨架，并在 manifest 中标记 `pending_actions` 包含 "script-harness:create"。

#### Scenario: 离线创建后补
- **WHEN** 用户在 script-harness 未启动时运行 `.bin/new-episode mldtree05 --offline`
- **THEN** 创建 staging 骨架 + 写 `manifest.json` 含 `pending_actions: ["script-harness:create"]`
- **AND** 后续 script-harness 启动可读 manifest 自行补建

### Requirement: 骨架模板

系统 SHALL 在 `astral-pipeline/.templates/empty-episode/` 维护新 episode 骨架模板。模板 MUST 包含 `raw/` 子目录的 4 个空子文件夹（doc/script/tts/recording）、空 `overlay/` 目录、空 `publish/` 目录、初始 `manifest.json`（仅含 episode 字段、空 raw 段、`schema_version`）。

#### Scenario: 模板被准确拷贝
- **WHEN** `.bin/new-episode` 从模板创建 `mldtree04/`
- **THEN** 拷贝后的 `mldtree04/` 目录结构与 `.templates/empty-episode/` 完全一致
- **AND** `mldtree04/manifest.json` 中 `episode` 字段已被填为 "mldtree04"

### Requirement: status 命令

系统 SHALL 提供 `astral-pipeline/.bin/status <id>` 命令，读取 `<id>/manifest.json` 并人类可读地展示：episode id、各 raw 段产物状态（缺失/有/版本）、consistency 标记、pending_actions、output 引用是否就绪。

#### Scenario: 查看半成品 episode 状态
- **WHEN** 用户运行 `.bin/status mldtree04`，此时 raw/script 已写、raw/tts 未写
- **THEN** 输出含 "script: ready (sha: ab12...)"、"tts: missing"、"consistency: tts not yet generated"
- **AND** 退出码 0
