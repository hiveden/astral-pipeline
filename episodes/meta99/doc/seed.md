# seed — meta99（测试 fixture，非业务期）

## 形态
- 系列：meta（占测试位，编号 99 区分真业务期 meta01-11）
- 长短：微型 ~20s
- 文章类型：测试用 fixture，**永不公开发布**

## 意图
3 仓全流程 smoke 测试用：上游 export → tts → astral preview/render 一遍跑通。
不是真要表达内容，只是覆盖关键字段类型 + 边界。

## 覆盖项（设计目的）
- 数字（百分比 / 单位）口播
- 短英文术语保留（MCP / A2A / AG-UI / SSE / WebSocket）
- 句末标点齐全（。/——）
- segments hook + content + cta 结构
- 削弱栏 / source 引用 / form 字段
- 多 segment id 稳定性测试

## 禁区
- 禁公开发布（publish.json `do_not_publish: true` 标记）
- 禁迁出测试 fixture 用作真业务范例

## 允许改动
- 任意修改 text 测试 tts 增量
- 删/加 segment 测试 id 稳定铁律

## 例外说明
本 fixture 由 CC 编写（破"seed 由用户口述"铁律）。
理由：测试 fixture 不是写稿场景，是工程产物；明确标注 `测试 fixture，非业务期`，避免混淆。
