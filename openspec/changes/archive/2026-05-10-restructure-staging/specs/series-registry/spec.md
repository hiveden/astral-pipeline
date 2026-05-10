## ADDED Requirements

### Requirement: 系列白名单单一事实源

系统 SHALL 在 `astral-pipeline/schemas/series.json` 维护唯一的系列白名单。所有跨项目消费方（script-agent-harness、astral-video）MUST 从此文件读取系列定义，禁止在各自代码库硬编码白名单。

#### Scenario: 新增系列时单点修改
- **WHEN** 用户决定引入新系列（例如 `tutorial`）
- **THEN** 仅需在 `schemas/series.json` 添加一项条目，所有消费方下次启动时自动识别
- **AND** 不需要修改 script-harness/web/lib/episode-id.ts 或 astral-video/src/v2/scripts/scaffold-v2.js

#### Scenario: 消费方读取白名单
- **WHEN** script-harness 或 astral-video 启动 / 校验 episode id
- **THEN** 必须解析 `astral-pipeline/schemas/series.json` 获取当前白名单
- **AND** 文件不存在时 SHALL 回退到内置默认列表并在日志中告警

### Requirement: 系列条目 schema

`schemas/series.json` SHALL 是一个对象数组，每项包含 `name`（kebab-case 字符串）、`naming`（`single` 或 `series-algo`）、`writers`（写入此系列产物的项目名数组）、`enabled`（布尔）字段。

#### Scenario: 解析有效的系列条目
- **WHEN** 系统读取 `{ "name": "mldtree", "naming": "series-algo", "writers": ["script-agent-harness", "tts-agent-harness", "ai-engineer-roadmap"], "enabled": true }`
- **THEN** 接受 id 形如 `mldtree03` 的两段命名
- **AND** 拒绝 id 形如 `mldtree` 的单段命名

#### Scenario: 拒绝无效条目
- **WHEN** 系统读取缺少 `name` 或 `naming` 字段的条目
- **THEN** 启动时 MUST 报错并指明缺失字段
- **AND** 不允许使用此条目校验任何 id

### Requirement: id 校验规则

系统 SHALL 提供一个一致的 id 校验函数，输入 episode id 字符串，输出"通过 / 拒绝 + 理由"。`naming=single` 系列接受 `<series><NN>`（如 `meta10`），`naming=series-algo` 系列接受 `<series><algo><NN>`（如 `mldtree03`）。系统 MUST 拒绝包含 `-vN` 后缀的 id。

#### Scenario: 接受合规 id
- **WHEN** 校验 `mldtree03` 且 `mldtree` 在白名单中且 `naming=series-algo`
- **THEN** 返回通过

#### Scenario: 拒绝版本后缀
- **WHEN** 校验 `meta10-v2`
- **THEN** 返回拒绝，理由 "version suffix forbidden"

#### Scenario: 最长前缀匹配
- **WHEN** 白名单同时含 `ml` 和 `meta`，校验 `meta10`
- **THEN** 匹配 `meta` 而非 `ml`（最长前缀优先）
