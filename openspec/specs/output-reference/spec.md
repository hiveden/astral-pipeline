### Requirement: output.json 引用而非二进制

每个 episode 的最终成品视频 SHALL 通过 `<id>/output.json` 以引用方式记录，而非把 mp4 文件本身存入 staging。该文件 SHALL 含 `video` 对象，包含 `path`（绝对路径或对象存储 URL）、`sha256`（视频文件的内容指纹）、`duration_s`（视频时长秒数，数值）字段。

#### Scenario: 渲染完成后写引用
- **WHEN** astral-video 渲染 `<id>` 完成生成 `final.mp4`
- **THEN** 在 `<id>/output.json` 写入 `{ "video": { "path": "/abs/path/to/final.mp4", "sha256": "<hex>", "duration_s": 423.5 }, "rendered_at": "<ISO>", "renderer_version": "<version>" }`
- **AND** mp4 文件本身留在 astral-video 项目目录或对象存储，不复制进 staging

### Requirement: rendered_at 与 renderer_version

`output.json` SHALL 含 `rendered_at`（ISO 8601 时间戳，渲染完成时间）和 `renderer_version`（字符串，标识渲染器版本，如 git commit 短 sha 或语义化版本）字段，便于追溯。

#### Scenario: 重新渲染时更新时间戳
- **WHEN** 同一 episode 因 overlay 变化重新渲染
- **THEN** 新 `output.json` 的 `rendered_at` 为新时间，`sha256` 通常会变化
- **AND** 旧 mp4 文件可能被新文件替换或共存（取决于 video 项目策略，与 staging 无关）

### Requirement: sha256 验证

任何下游工具（如发布脚本）从 output.json 读取 video 路径前 SHALL 验证文件存在，并 MAY 重新计算 sha256 与记录值比对。当不一致时 MUST 报告"output.json 与实际文件不一致"并阻止发布。

#### Scenario: 文件被外部修改
- **WHEN** 发布工具读 `output.json`，path 指向的文件实际 sha256 与记录不符
- **THEN** 发布工具退出，输出 "output mismatch: expected <sha1> got <sha2>"
- **AND** 退出码非 0

#### Scenario: 文件不存在
- **WHEN** `output.json` 的 path 文件已被移动或删除
- **THEN** 发布工具退出，输出 "output file not found: <path>"

### Requirement: output.json 不存在的语义

`<id>/output.json` 不存在 SHALL 等价于"此 episode 尚未成功渲染"。任何依赖最终视频的下游操作（发布、分发）MUST 在发现 output.json 缺失时拒绝执行。

#### Scenario: 未渲染时拒绝发布
- **WHEN** 用户尝试发布 `<id>`，但 `output.json` 不存在
- **THEN** 发布工具退出，输出 "no rendered output for <id>"
- **AND** 退出码非 0
