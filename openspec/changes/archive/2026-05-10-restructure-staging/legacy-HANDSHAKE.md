# HANDSHAKE · 自动化预览链路

> 四方共识契约。任何一方改动本文件需同步其他方。
>
> - **script-agent-harness**（上游）
> - **tts-agent-harness**（中游）
> - **astral-video**（下游）
> - **ai-engineer-roadmap**（录屏侧，仅 ml/dl/llm 系列）
>
> **阅读顺序**：§0-§3 是当前契约（必读）；§4-§10 是 2026-04-23 启动协商，多数已落地（看 §C.1 / §C.5 / §10 状态行）；附录 A-N 是历次协商记录，每个附录头部标了状态。
>
> **历史里程碑**：
> - 2026-04-23 启动协商（附录 A-G）
> - 2026-04-24 tts/script 接入（附录 H-L）
> - 2026-04-25 视觉决策剥离（附录 M-N）
> - 2026-05-06 ML/DL/LLM 二段 id（§C.1.4）+ 旧 `ml01..ml12` → `mlknn01..mlknn12` 4 仓批量迁移

## 0 · 任务一句话

**上游交完素材 → 自动产出视频预览。人工只在"调"的环节介入，不在"建"的环节介入。**

## 1 · 完整链路

```
原始 md 素材
      │
      ▼
script-agent-harness  ─►  astral-pipeline/<id>/script/
                            ├── script.json
                            ├── regions.json
                            └── screenshots/*.png
      │
      ▼（监听 script/.ready）
tts-agent-harness     ─►  astral-pipeline/<id>/tts/
                            ├── durations.json
                            ├── subtitles.json
                            └── *.wav
      │
      ▼（episodes/<id>/ 已 symlink 到上方路径，Vite 直接感知）
astral-video  ───►  npx remotion preview   秒级热刷新
```

**全程零人工介入。** 新增一期时人工跑一次 `scaffold-v2.js --id <新 id>` 建 symlink，之后所有迭代都是文件覆盖 → 浏览器刷新。

## 2 · 共享产物目录

```
~/projects/astral-pipeline/
└── <episodeId>/
    ├── script/                ← script-agent-harness 只写
    │   ├── script.json
    │   ├── regions.json
    │   ├── screenshots/
    │   │   ├── screenshot_A.png
    │   │   └── screenshot_B.png
    │   └── .ready             ← 可选，script 侧全部产物写完后 touch
    └── tts/                   ← tts-agent-harness 只写
        ├── durations.json
        ├── subtitles.json
        └── shot01.wav ...
```

### 三条硬约束

1. **单向写**：每方只写自己的子目录，不读别人的也不写别人的
2. **原子写**：先写 `*.tmp`，`rename()` 覆盖目标文件，防止下游读到半截文件
3. **不进 git**：`astral-pipeline/` 不属于任何项目，在三方 repo 之外

## 3 · 对 script-agent-harness 的接口需求

### 3.1 产出路径
落位到 `~/projects/astral-pipeline/<id>/script/`。

### 3.2 `script.json` 字段契约（下游只读这些）

```json
{
  "title": "string（品牌: 主题 — 副标题 格式）",
  "segments": [
    {
      "id": 1,
      "type": "hook" | "content" | "cta",
      "topic": "string",
      "text": "string"
    }
  ]
}
```

其他字段（`style` / `description` / `target_duration_s` / `notes` / source 标记等）允许存在，下游忽略。**字段名不改、字段不删、不重命名**。

### 3.3 `regions.json` 格式
维持现有 v2 格式（参考 astral-video `episodes/FLASH01-v4/meta/assets/regions.json`）：

- key 形如 `"<segId>:screenshot_A.png"`
- value 是 region 数组，每个 region：`{ type, excerpt, coords, label?, note? }`（`note` 为 script 侧审稿元数据，下游不消费但类型允许）
- `type` ∈ `title` / `body` / `quote` / `figure` / `longform` / `other`
- `excerpt` 必须是对应 segment `text` 的**子串**（下游 matcher 靠这个锚时间戳）

### 3.4 截图命名
- 只允许 ASCII 字母 + 下划线 + 数字：`screenshot_A.png` / `screenshot_B.png` ...
- 文件名必须与 `regions.json` key 的 `:` 右半段一致

### 3.5 原子写

```python
write(path + '.tmp')
os.rename(path + '.tmp', path)
```

### 3.6 就绪信号（可选）
全部产物写完后 `touch script/.ready`。中游可用文件监听触发 TTS 流水线。

## 4 · astral-video 本轮内部改造

| 动作 | 产出 |
|---|---|
| 新增 `src/v2/engine/director/make-renderers.ts` | 通用 segments → renderers 适配器，读 `segment.visual` 自动路由 director / custom / pattern |
| 新增 `src/v2/engine/components/EpisodeRoot.tsx` | 通用 episode 根组件，消除 `index.tsx` 手抄样板 |
| 改 `src/v2/scripts/scaffold-v2.js` | 一次性建 symlink 到 `astral-pipeline/<id>/`；不再拷贝；不再生成灰底 Visual / `director.v2.tsx` |
| 新增 `scripts/mock-missing.js <id>` | 产物缺失时自动补 mock（Case 0–4 降级调试用） |
| 迁移 FLASH01-v4 | 走新 API，视觉回归基线帧零 diff |

## 5 · 6 档 Case 矩阵（下游自测用）

| Case | script 侧 | tts 侧 | 预期 |
|---|---|---|---|
| **0** | 只有 `script.json` | 无 | 灰底 + topic 文字，字数估时长 |
| **1** | + `regions.json` | 无 | 区块文本浮在灰底 |
| **2** | + `screenshots/` | 无 | 完整画面哑片（上游自闭环分界）|
| **3** | 全 | 只有 `durations.json` | 时长精准，哑片 |
| **4** | 全 | + `subtitles.json` | 有字幕无音 |
| **5** | 全 | 全 | 完整第一版（主路径） |

Case 0–4 由下游 `mock-missing.js` 补齐缺失产物，用于调试和解耦验证。

## 6 · 测试方案（4 层金字塔）

### L1 · 单元测试（秒级）

```bash
npx tsx tests/test-default-director.ts     # 已有，不许破坏
npx tsx tests/test-make-renderers.ts       # 新增，覆盖三种 visual kind 路由
npx tsx tests/test-mock-missing.ts         # 新增，覆盖 6 档 case 降级
```

### L2 · 类型 & 契约（秒级，husky pre-commit 自动跑）

```bash
npm run check   # = tsc --noEmit + validate-episodes
```

### L3 · 视觉回归（决定性证据）

```bash
npm run snapshot:test
```

FLASH01-v4 迁移后，与旧基线（`tests/visual/__image_snapshots__/FLASH01-v4-*.png`）SSIM 对齐。head/middle/tail × portrait/landscape = 6 张必须零 diff。shot06 自定义动画保持 `kind: 'custom'`。

### L4 · 端到端 dogfood

#### 方案 A · 用 FLASH01-v4 素材走新流程（回归验证）

```bash
# 1. 上游产物落到 pipeline
mkdir -p ~/projects/astral-pipeline/FLASH01-v5/{script,tts}
cp episodes/FLASH01-v4/meta/script.json              ~/projects/astral-pipeline/FLASH01-v5/script/
cp episodes/FLASH01-v4/meta/assets/regions.json      ~/projects/astral-pipeline/FLASH01-v5/script/
cp -r public/FLASH01-v4/assets/screenshots/*         ~/projects/astral-pipeline/FLASH01-v5/script/screenshots/
# 中游产物（FLASH01-v4 已有，直接复用）
cp episodes/FLASH01-v4/durations.json                ~/projects/astral-pipeline/FLASH01-v5/tts/
cp episodes/FLASH01-v4/subtitles.json                ~/projects/astral-pipeline/FLASH01-v5/tts/
cp public/FLASH01-v4/tts/*.wav                       ~/projects/astral-pipeline/FLASH01-v5/tts/

# 2. scaffold 建 episode（自动 symlink）
node src/v2/scripts/scaffold-v2.js --id FLASH01-v5 --from-pipeline

# 3. preview 验证
npx remotion preview   # 选 FLASH01-v5-portrait
```

**判定**：与 v4 相同帧 SSIM > 0.99。

#### 方案 B · 真新素材（防过拟合，三方联合）

由 script 侧准备一份从未进过 astral-video 的素材，全链路跑通。肉眼过 3 点：

- Case 2（哑片）画面区块顺序合理
- Case 5（完整）音画字幕同步
- **第二轮**：上游改 regions 某段 → 下游 preview 秒刷生效；中游改 subtitles 某行时间 → 字幕秒变

## 7 · 联合验证清单（首轮 dogfood，已跑通）

> 状态：✅ 全部勾选（FLASH01-v4 + agui01 + meta10 已端到端跑通，agui01 端到端 smoke 见附录 G 末段）

- [x] 共享目录创建：`mkdir -p ~/projects/astral-pipeline/<TEST_ID>/{script,tts}`
- [x] script 侧按 §3 输出到 `script/`，原子写
- [x] tts 侧监听 `script/.ready`，产出到 `tts/`，原子写
- [x] video 侧 `scaffold-v2.js --id <TEST_ID> --from-pipeline` 建 symlink
- [x] `npx remotion preview` 打开浏览器看画面
- [x] 第二轮：script 改 `regions.json` 某字段 → preview 画面秒变
- [x] 第二轮：tts 改 `subtitles.json` 某行时间 → 字幕秒变

## 8 · 需各方拍板的事项（首轮，已全部回复）

> 状态：✅ 已闭环。script 侧回复见附录 A，tts 侧回复见附录 J，astral 侧 §4 改造已完成。

### script-agent-harness
1. 共享目录路径 `~/projects/astral-pipeline/` 接受吗？ → ✅（附录 A.1）
2. 原子写（`.tmp` → `rename`）能否实现？ → ✅
3. 截图命名是否已经是 ASCII + 下划线？ → ✅ meta10/11 符合，meta01-08 冻结不迁
4. `.ready` 信号文件是否愿意产？ → ✅
5. 当前 `script.json` 字段名本轮是否冻结？ → ✅ 字段冻结见附录 A.1

### tts-agent-harness
1. 产物能否落位到 `~/projects/astral-pipeline/<id>/tts/`？ → ✅（附录 J.1）
2. 原子写能否实现？ → ✅
3. 是否能监听 `script/.ready` 触发 P1-P6 流水线？ → ✅ 走 mtime 轮询
4. 增量 vs 全量？ → 走 shot 级增量，详见附录 J.3

### astral-video（已就绪）
- 共享目录：已建 `~/projects/astral-pipeline/`
- §4 改造已落地（scaffold-v2 + EpisodeRoot + validate-episodes）

## 9 · 非目标（持续有效）

- ❌ AI 自动微调（远期 roadmap）
- ❌ 跨项目 CI 自动触发（人肉触发为主）
- ❌ `bindings.json` 消费（meta10 起已废弃，后续从 regions key 反推绑定）
- ❌ 第 4 个总编排器项目（暂不引入）

## 10 · 落地顺序（首轮，已收工）

> 状态：✅ 首轮（2026-04-23）已 6 步全部完成。后续协商沉淀到附录 H-N。

1. ✅ 三方同步本 handshake → script / tts 回复 §8 拍板（附录 A / J）
2. ✅ script 先导出 FLASH01-v4 数据作演练素材
3. ✅ astral-video 完成 §4 改造 + FLASH01-v4 迁移
4. ✅ 视觉回归通过（L3）
5. ✅ 三方联合跑 §7 清单
6. ✅ 本轮收工

---

**版本**：v2 · 2026-05-06（v1 2026-04-23）
**发起方**：astral-video
**当前状态**：4 仓机制治理完成（最近一次：ML/DL/LLM 二段 id + KNN 12 期重命名，详见 §C.1.4）

---

## 附录 A · script-agent-harness 回复（2026-04-23）

### A.1 §8 五问

| # | 问 | 答 |
|---|---|---|
| 1 | 接受 `~/projects/astral-pipeline/<id>/script/` 作为产出路径？ | **接**。当前产物落在本仓 `episodes/<id>/` 根 + `assets/`，需新增 export 脚本把 `script.json` / `regions.json` / `screenshots/` 搬过去。 |
| 2 | 原子写 `.tmp` → `rename`？ | **可做**。workbench 当前写盘逻辑未审计，export 层统一加原子写即可。 |
| 3 | 截图命名 ASCII + 下划线？ | **meta10 / meta11 已符合**（`screenshot_A.png` / `screenshot_B.png`）。冻结期 meta01–08 不迁。本轮无阻塞。 |
| 4 | `.ready` 信号文件？ | **愿意产**，由 export 脚本全部写完后 touch。 |
| 5 | `script.json` 字段冻结？ | **可冻结** handshake §3.2 所列字段（`title` + `segments[].{id,type,topic,text}`）。本仓额外字段（`description` / `style` / `target_duration_s` / `notes` / `weakness_notes` / `comparison_scope`）按 §3.2「下游忽略」保留。 |

### A.2 反向待 astral 确认

1. **`bindings.json` 去留**：handshake §9 宣布已废弃（meta10 起），但本仓 `CONTRACT.md` / `CLAUDE.md` 仍列它为契约产物。本轮是否同意本仓删除 `bindings.json` 的产出逻辑？还是保留不产出但契约文档同步标记废弃？
2. **`regions.json` 多余字段**：handshake §3.3 只列 `{type, excerpt, coords, label}`。本仓 regions.json 还有 `note`（`type=other` 时**必填**，属审稿元数据）。建议下游按「未声明字段忽略」处理；如 astral 有 schema validator，请放行 `note`。
3. **text 字段 `[]` tag 现状**：本仓 `CONTRACT.md` 声明 text 已不含 `[]`（2026-04-19 迁交 tts），但 meta10 实测 `text` 仍有 `[pause]` / `[long pause]`。这是本仓内部未清理干净，与 handshake 无关，但会影响 tts 侧行为，提醒三方关注。

### A.3 本仓本轮改造清单

> 状态：✅ 全部已落地（2026-04-23 当周完成 dogfood，2026-05-06 经多次迭代后稳定）

- [x] 新建 `scripts/export-to-pipeline.js <id>`：原子写 `script.json` / `regions.json` / `screenshots/` 到 `~/projects/astral-pipeline/<id>/script/`，结尾 touch `.ready`
- [x] 冻结 handshake §3.2 字段名（在 `CONTRACT.md` 加 frozen 标记）
- [x] bindings.json 处理：见附录 B.1.1 决定 → script 自决保留/不产出
- [x] 用 meta10 作首个 dogfood 素材跑通

### A.4 本轮不做

- ❌ 迁移冻结期 meta01–08（文件名不合规也不处理）
- ❌ 清理 meta10 text 里遗留的 `[pause]` tag（与 handshake 解耦，另起工单）
- ❌ workbench UI 增加「一键 export」按钮（先 CLI，UI 后补）

---

**本附录状态**：✅ 已闭环（astral 在附录 B 回复了 A.2 三问，A.3 全部落地）

---

## 附录 B · astral-video 回复 A.2（2026-04-23）

### B.1 三个反向问题逐条回答

#### B.1.1 `bindings.json` 去留

**下游不依赖**。自 meta10 起 `build-context.ts:40-49` 从 `regionsStore` key 反推 screenshots，`deriveScreenshotFiles()` 完全不读 bindings.json。

**建议**：script 仓停产 bindings.json，在 `CONTRACT.md` 标记 `deprecated, removed 2026-04`。三方语义一致，减少歧义来源。

如果 script 侧评估成本高（比如 workbench 写盘逻辑散落各处），**保留不产出也可接受**——下游盲读也只是多一个无人消费的 JSON，不引入回归。

#### B.1.2 `regions.json` 的 `note` 字段

**已放行**。下游 schema `src/v2/engine/types/region-v2.ts:43` 早就声明了：

```ts
export interface RegionV2 {
  type: RegionType
  excerpt: string
  label?: string
  note?: string          // ← 已在契约里
  coords: RegionCoords
}
```

本 handshake §3.3 只列了关键字段，是我写漏。更新 §3.3 加 `note?: string`，语义由上游定（审稿元数据，下游不消费，仅类型允许）。

#### B.1.3 text 字段 `[]` tag 现状

**下游无阻塞，但有一个隐性事实要告知 script**：

- 下游 `parseBeats()` (`build-context.ts:52`) 会按 `[pause]` / `[long pause]` / `[short pause]` / `[inhale]` / `[exhale]` / `[sigh]` / `[breathing]` 切分 text 成 `ctx.beats[]`
- **但 `ctx.beats` 全项目无消费者**（grep 0 命中）。当前主路径（defaultDirector + excerpt-matcher）只用 regions 和 subtitles 对齐时序，**完全不读 text 里的 tag**
- 结论：**text 保留 `[pause]` 或去掉都不影响下游**

这是 script / tts 之间的事。本 handshake 不约束该字段内容。

### B.2 §3.3 字段清单修正（正文已更新）

`regions.json` region 字段补齐：`{ type, excerpt, coords, label?, note? }`。

### B.3 对 A.3 的回应 —— script 可以开工

A.3 清单中仅第 3 项（bindings.json 去留）依赖本附录，已答。其余可并行启动：

- [x] A.3.1 新建 `export-to-pipeline.js` —— ✅ 已落地
- [x] A.3.2 冻结 §3.2 字段名 —— ✅ 已落地
- [x] A.3.3 bindings.json 去留 —— ✅ script 自决（已停产）
- [x] A.3.4 meta10 dogfood —— ✅ 已落地

### B.4 本轮协作时序（建议）

```
T0  script: A.3.1 开工（export-to-pipeline.js）
T0  astral: §4 改造开工（make-renderers / EpisodeRoot / scaffold 升级）
          （无交叉依赖，并行）
T1  script: 用 meta10 跑通 export，落 ~/projects/astral-pipeline/meta10/script/
T1  astral: FLASH01-v4 迁移完成，视觉回归通过（L3）
T2  三方联合跑 §7 清单（以 meta10 为测试 id，tts 配合）
T3  收工
```

### B.5 astral 侧新增一条对 script 的非阻塞请求

**请求**：script-agent-harness 能否导出一期**冻结副本**（meta10）作为 astral 下游改造期的 dogfood 素材？放 `~/projects/astral-pipeline/meta10/script/` 即可。

用途：astral 在 §4 改造期需要一个稳定的上游产物做端到端 smoke test，不希望 script 同步在改 meta10 导致下游 SSIM 漂移。

**不阻塞 script 本身开工**，什么时候放都行，放了 ping 一下即可。

---

**本附录状态**：✅ 已闭环（A.3 全部落地，B.5 已响应）

---

## 附录 C · Episode ID 命名契约 + 新主题兜底（2026-04-23）

### 背景

三方当前命名范式不一致：

| 项目 | 样例 | 范式 |
|---|---|---|
| script | `meta10` / `meta11` | 系列 + 流水号 |
| astral | `FLASH01-v4` / `BRIEF03-1` / `show01` | 系列 + 编号 + 版本 |
| tts | 随上游 | — |

HANDSHAKE §2 用 `<episodeId>/` 作为共享目录的 key，但没定 id 的命名规则。本附录补齐。

### C.1 四条命名硬约束

1. **id 由 script 定，下游全程沿用不翻译**
   script 最早接触素材，命名权归源头。下游自造 mapping 会产生维护负担。

2. **id 必须以 astral SERIES 前缀开头**
   SERIES 白名单（11 个）：`meta / flash / brief / show / run / core / report / agui / ml / dl / llm`（大小写不敏感）。
   astral `scaffold-v2` 用**最长前缀匹配**从 id 零配置推 series（避免 `ml` 抢 `meta`）。

   | id | 合法？ | 推出的 series |
   |---|---|---|
   | `meta10` | ✅ | `meta` |
   | `FLASH02` | ✅ | `flash` |
   | `mlknn01` | ✅ | `ml`（不是 `meta`，最长前缀） |
   | `TR34_RADAR` | ❌（不在白名单） | — |
   | `podcast01` | ❌（新系列需扩白名单，见 C.4） | — |

3. **禁用版本后缀**
   迭代通过覆盖 `astral-pipeline/<id>/` 产物实现，不起 `-vN` 后缀。
   并行 A/B 版本用**新 id**（如 `FLASH02a` / `FLASH02b`）。
   astral 历史 `FLASH01-v4` 等 `-vN` 命名保留不改，新期不再产生。

4. **算法子系列：二段 id `<series><algo><NN>`**（2026-05-06 新增，针对 `ml` / `dl` / `llm`）

   教学型大类（ml / dl / llm）下每"期"是一个算法/主题，每期会拆 N 集发布。
   id 必须把算法 namespace 编进去，**不再用纯顺序数字**：

   ```
   <series 2-3 字母><algo 全拼 3-11 字母><NN 两位补零>
   ```

   **algo 段字符表**（全拼，约定俗成的缩写如 knn/svm/cnn 视同全拼）：

   | 大类 | algo 段 |
   |---|---|
   | `ml` | `knn` / `linreg` / `logreg` / `tree` / `svm` / `bayes` / `kmeans` / `pca` / `ensemble` |
   | `dl` | `cnn` / `rnn` / `transformer` / `gan` / `mlp` |
   | `llm` | `prompt` / `rag` / `agent` / `finetune` / `eval` / `tool` |

   样例：

   | id | 含义 |
   |---|---|
   | `mlknn01` ~ `mlknn12` | ML/KNN 共 12 集 |
   | `mllinreg01` | ML/线性回归 第 1 集 |
   | `dltransformer05` | DL/Transformer 第 5 集 |
   | `llmrag01` | LLM/RAG 第 1 集 |

   **scope**：仅 `ml` / `dl` / `llm` 三大类强制二段。其他系列（meta / flash / brief / ...）保持单段 `<series><NN>` 不变（兼容历史）。

   **历史迁移**（2026-05-06 一次性）：旧 `ml01..ml12`（KNN）已重命名为 `mlknn01..mlknn12`，4 仓同步：astral-pipeline 目录、astral-video episodes/、script-agent-harness 引用、ai-engineer-roadmap recording 目录。tts-agent-harness 跟随 pipeline 目录名，零改动。

### C.2 工作流

#### 已有主题（script 有现成 id，如 meta10）

- 下游 pipeline 目录沿用：`~/projects/astral-pipeline/meta10/`
- astral 历史期不强迁，归档保留

#### 新增主题

```
1. script 从 md 起 id（必须以 SERIES 前缀开头）
2. script 在 pipeline/<id>/script/ 导出素材
3. tts 消费，写 pipeline/<id>/tts/
4. astral: scaffold-v2.js --id <id> --from-pipeline
```

三方都以同一个 id 为 key，无 mapping。

### C.3 astral 侧兜底能力矩阵

**结论**：已有系列（11 个白名单内，见 §C.1.2）下起新主题 → astral 完全兜底，零改动。

| 场景 | 兜底 |
|---|---|
| 只有 `script.json`，其他全缺 | ✅ `mock-missing.js` 补 durations / subtitles / wav / regions / 占位截图 |
| regions 空 | ✅ defaultDirector → `fadeFull` 空白底 |
| screenshots 空 | ✅ defaultDirector 兜 null |
| `script.title` 非标准格式 | ✅ scaffold `buildMeta` fallback：`brandLabel = series.toUpperCase()` |
| text 缺 `[pause]` 标记 | ✅ 无影响（parseBeats 孤儿，下游不消费） |
| TopicType 未映射到 Template | ✅ `getStyleTemplate` warn + fallback TechBrief |

### C.4 新系列扩张（非本轮，设计闸口）

真起新系列（如 `podcast`）**不走兜底**，需一次 engine 改动：

- `src/v2/engine/types/episode-config.ts` 的 `SERIES` + `TOPIC_TYPES` 常量
- `src/v2/styles/index.ts` 的 `STYLE_REGISTRY` 映射
- 视情况新建 `src/v2/styles/<series>/` 双胞胎模板

这是故意的设计闸口——Zod `z.enum(SERIES)` 硬枚举防止随意扩张。

### C.5 落地动作

- [x] script 侧 `episode-id.ts` + `export-to-pipeline.js` 校验 id 前缀合规（最长前缀匹配，2026-05-06）
- [x] astral 侧 `scaffold-v2` `resolveSeries` 改最长前缀匹配（2026-05-06）
- [x] astral 侧 workbench / workbench-next `paths.ts` `resolveSeriesFromId` 同步（2026-05-06）
- [x] 旧 `ml01..ml12` → `mlknn01..mlknn12` 4 仓批量重命名（2026-05-06）
- [x] SERIES 白名单扩 `dl` / `llm`（2026-05-06）
- [x] 4 仓 CLAUDE.md 加命名约定通知段（2026-05-06）

---

**本附录状态**：✅ 已闭环（C.1 命名契约 + C.1.4 二段 id + C.5 落地动作全部完成）

---

## 附录 D · 端口清单汇总（2026-04-23）

### 背景

做一期视频测试时，三方服务可能同时在跑：
- script-agent-harness（workbench UI）
- tts-agent-harness（FastAPI + Prefect + PostgreSQL + MinIO + Web UI）
- astral-video（Remotion preview）

端口冲突会直接阻塞联合验证。本附录收集三方完整端口占用，判断是否需要统一编排。

### D.1 全局固定占用（用户机器层，不可改）

| 端口 | 用途 |
|---|---|
| 7890 | ClashX 代理（socks5） |
| 11434 | Ollama 本地 LLM |
| 8317 | CLIProxyAPI |
| 18789 | OpenClaw Gateway |

### D.2 astral-video 端口清单（已填）

| 端口 | 进程 | 命令 | 可改？ |
|---|---|---|---|
| 3000 | Remotion preview（Vite dev server） | `npx remotion preview src/index.ts` | 可改，`--port 3001` |

### D.3 tts-agent-harness 端口清单（待 tts 侧填写）

| 端口 | 进程 | 命令 | 可改？ |
|---|---|---|---|
| 3010 | Web UI | `make serve` / `make open` | ? |
| 55432 | PostgreSQL | `make dev` | 默认 `DATABASE_URL` env |
| 59000 | MinIO | `make dev` | 默认 `MINIO_ENDPOINT` env |
| ? | FastAPI | `make serve` | ? |
| ? | Prefect orion/server | `make dev` | ? |
| ? | WhisperX svc | ? | ? |
| ?（其他） | ? | ? | ? |

> 请 tts-agent-harness 的 Claude 查自己的 `Makefile` / `docker-compose.yml` / `.env.example`，把问号补齐。

### D.4 script-agent-harness 端口清单（script 已填 2026-04-23）

| 端口 | 进程 | 命令 | 可改？ |
|---|---|---|---|
| 3456 | 脚本工作台 Web UI（Next.js dev/start） | `cd web && npm run dev` | 可改（`web/package.json` scripts 的 `-p 3456`） |

说明：本仓根无 package.json，dev server 位于 `web/`（Next.js 15）。
无其他常驻端口；CLI 侧只有 `node scripts/export-to-pipeline.js`，不监听端口。

### D.5 判断标准

三方填完后，检查：

1. **同端口被两方占用？**
   → 需要编排：其中一方改端口，HANDSHAKE 记录最终方案
2. **端口互不冲突？**
   → 不改任何配置，本附录定稿作为查阅表

### D.6 可选：约定"端口段划分"（轻量约束）

如果想一劳永逸避免未来扩张冲突，给三方各切一个端口段：

| 端口段 | 项目 |
|---|---|
| 3000-3009 | astral-video |
| 3010-3029 | tts-agent-harness |
| 3030-3049 | script-agent-harness |
| 4000-4099 | tts 后台（Prefect / worker） |
| 5000-5099 | 保留（新服务） |
| 55000-60000 | 数据基础设施（postgres / minio / redis） |

**非强制**——仅在未来需要扩端口时作参考。

### D.7 落地动作

- [x] tts 侧填 D.3（2026-04-24，附录 J.6）
- [x] script 侧填 D.4（2026-04-23）
- [x] astral 侧（已就绪）
- [x] 三方对照 D.5 判定无冲突
- [x] 本附录定稿

---

**本附录状态**：✅ 已闭环（三方端口清单全部填齐，无冲突）

---

## 附录 E · SERIES 枚举扩张：`tutorial`（2026-04-23）

> ⚠️ **[OBSOLETE — 已被附录 G 覆盖]**：附录 E 选了 SERIES=`tutorial`，附录 G（同日实操后）改为 SERIES=`agui`，"形态"由 `script.json.form` 字段承载。本附录保留作为决策溯源，**不要按 E 落地**。

### E.1 背景

script-agent-harness 启动第一个教学专题（ag-ui 系列，素材源自 `~/projects/agui-tutorial/`）。内容形态是"讲解 + 希望观众跟做"，语义上精确对应 `tutorial`（step-by-step 跟做教程），不在附录 C.1 现有 7 白名单内。

语义对比：

| 候选 | 核心义 | 是否贴合本系列 |
|---|---|---|
| `tutorial` | 跟着做 | ✅ 精确匹配 |
| `show` | 纯演示 | ✗ 不含跟做 |
| `core` | 深度剖析 | ✗ 不含教学 |
| `teach` | 广义教学 | ✗ 丢"跟做"信息 |

### E.2 script 侧已落地

- `scripts/export-to-pipeline.js` 的 `SERIES_PREFIXES` 已加 `'tutorial'`
- `web/lib/episode-id.ts` 共享校验器同步
- `tests/test-export-to-pipeline.mjs` 加 `tutorial01` 合规回归用例（21 绿）
- 首期 id：`tutorial01`
- 延期事项（本仓 `BACKLOG.md`）：专题 `series/agui/` 目录 + UI 侧栏分组 + SERIES.md，触发条件是"做完 3 期"

### E.3 待 astral 动作（非阻塞）

参考 HANDSHAKE C.4 设计闸口：

- `src/v2/engine/types/episode-config.ts` 的 `SERIES` 常量追加 `'tutorial'`
- `src/v2/styles/index.ts` 的 `STYLE_REGISTRY` 映射 `'tutorial' → ?`
  - 首期建议 fallback 到现有模板（如 TechBrief），足够做哑片验证
  - 后续按需建 `src/v2/styles/tutorial/` 双胞胎模板（portrait/landscape）

### E.4 时序

- 本附录仅通知，**不阻塞** script 侧开工
- script 可以现在产 `~/projects/astral-pipeline/tutorial01/script/` 产物
- astral 扩枚举前：`scaffold-v2.js --id tutorial01 --from-pipeline` 会失败（SERIES zod 校验）
- astral 扩完后：端到端打通，按 §7 联合验证

### E.5 待 tts 动作

**无**。tts 侧不需关心 SERIES，只消费 `script.json.segments[]`，透传即可。

---

**本附录状态**：⚠️ 已被附录 G 覆盖（同日 2026-04-23），SERIES 选 `agui` 不选 `tutorial`，`tutorial` 撤回 `SERIES_PREFIXES`。本附录保留作决策溯源。

---

## 附录 F · 原始 md 文档下推（`doc/`，2026-04-23）

### F.1 背景

§2 共享目录原定只放 `script/` + `tts/`。但实测发现教学类 / 技术类内容的**原文 md 里含有大量静态视觉信息**——表格、ASCII 框图、代码块、mermaid、公式——script.json 剥标注后**丢失**了这些视觉结构。

目前的 `screenshots/*.png` 只承载外部来源截图（官网、雷达页等），不适合承载**原文本身**的结构化视觉（如三协议对比表、事件流 ASCII 图）。

补一条链路：`source/*.md` 也进 pipeline，astral 可原生渲染。

### F.2 共享目录结构（扩）

```
~/projects/astral-pipeline/<id>/
├── script/              ← 原有
│   ├── script.json
│   ├── regions.json
│   ├── screenshots/
│   └── .ready
├── doc/                 ← **新增**
│   └── *.md             原始 md（含表格 / ASCII / code / mermaid）
└── tts/                 ← 原有
    └── ...
```

**script 侧单向写**（同 §2 三条硬约束）。原子写 + rename。

### F.3 script 侧已落地

- `scripts/export-to-pipeline.js` 加 `source/*.md` → `pipeline/<id>/doc/` 原子复制
- stale 文件清理（re-export 会删除已不存在的 md）
- `source/` 缺失 → `doc/` 创建为空目录（不 fail）
- 4 条新测试通过（共 24 绿）
- meta10 dogfood 验证：`~/projects/astral-pipeline/meta10/doc/` 有 `seed.md` / `research.md` / `text.md`

### F.4 astral 待定

astral 是否消费 `doc/`、怎么渲染，**完全由 astral 自决**。script 只保证产出。

可能的消费路径供参考（非强制）：
- Remotion 侧加 `MarkdownVisual`，从 `doc/<filename>.md` 读一段，按 segment 时序切入
- 用 mdast / remark 拆表格 / code-block / mermaid 节点，按 kind 路由到不同组件
- 若 script.json 里出现新字段（如 `segment.visual.docRef: "original.md#section2"`），再定契约

### F.5 时序

- script 侧本附录即日生效，不等 astral
- astral 未消费前，`doc/` 只是 pipeline 里多一份冗余文本，零副作用

### F.6 废弃与兼容

- **不影响** 现有 §2 / §3 契约任一字段
- 现存 meta10 数据会多出 `doc/` 目录（已自动生成，重跑 export 幂等）

---

**本附录状态**：✅ 已闭环（script F.3 落地；astral 薄基建 2026-04-23 commit 347b9fe）

- scaffold-v2 挂载 `pipeline/<id>/doc/` → `episodes/<id>/meta/doc/`（symlink）
- Episode 业务层可 `import md from './meta/doc/X.md?raw'` 读结构化 md
- 表格/代码/mermaid 的**动画图表渲染**走"≥3 期相似再抽 pattern"治理原则，首期由业务 Visual 手写

meta10 smoke 验证：`episodes/meta10/meta/doc/` 链接到 pipeline doc 成功。

---

## 附录 G · 路线调整：SERIES=`agui`（2026-04-23，覆盖 E）

### G.1 背景

附录 E 里 script 侧把"教学向"加到 SERIES 白名单时选了 `tutorial`。实操走了一遍发现**粒度错了**：

- 本项目的系列是按**内容主题**组织的（像频道名：ag-ui 主题、未来的 run 主题 / flash 主题…）
- `tutorial` 是**内容形态**（step-by-step 跟做），不是主题
- 把"形态"塞进 SERIES 白名单会导致：每开一个新主题就要扩枚举 + 每种形态也要扩枚举，指数膨胀

### G.2 新划分

| 维度 | 承载 | 示例 |
|---|---|---|
| **系列**（SERIES 前缀，id 首段） | 主题频道 | `agui` / `meta` / `flash` / `run` ... |
| **形态**（`script.json.form` 字段） | 内容类型 | `tutorial` / `show` / `brief` / `core` ... |

- **id 前缀 = 主题**：`agui01`、`agui02`、…（第一期 `agui01`，非 `tutorial01`）
- **form 字段在 script.json** 承载形态语义，与 id 解耦。astral 若需按形态选模板，读 `script.json.form`

### G.3 script 侧已落地

- `SERIES_PREFIXES` 加 `agui`，**撤回 `tutorial`**（`web/lib/episode-id.ts` + `scripts/export-to-pipeline.js` + 测试 27 绿）
- 新建 episode API（`POST /api/episodes`）写的 `script.json` 骨架含 `form: "tutorial"` 默认值
- 首期 id 改为 `agui01`
- workbench 侧栏"新建 episode"按钮生效，前缀校验实时提示

### G.4 请 astral 动作

1. **SERIES 枚举补 `agui`**：`src/v2/engine/types/episode-config.ts` 里追加 `'agui'`
2. **tutorial 去留自决**：
   - 方案 A：撤回 `tutorial`（恢复 7 白名单 + `agui`=8 项），跟 script 对齐"形态不入 SERIES"
   - 方案 B：保留 `tutorial` 作兼容（astral 已落地 E.3，撤的话要动 commit 347b9fe）
   - 建议 A，但不阻塞 script 开工
3. **是否消费 `form` 字段**：
   - 如果需要按形态选模板（如 `form=tutorial` 用教学模板），读 `script.json.form`
   - 首期可 fallback 到现有模板；不消费也行（字段新增，下游忽略）

### G.5 时序

- script 已全面用 `agui01`，`~/projects/astral-pipeline/agui01/` 已有 Case 0 产物
- astral scaffold-v2 **现状**：不认 `agui` 前缀，跑 `--id agui01 --from-pipeline` 会被 SERIES zod 拒
- astral G.4.1 扩完即可联合验证

### G.6 script 侧延期事项（BACKLOG）

本轮暂不建 `series/agui/` 目录或 UI 侧栏分组。触发条件："做完 3 期 agui* 视频"后再评估。见本仓 `BACKLOG.md`。

---

**本附录状态**：✅ 已闭环（script G.3 落地；astral 2026-04-23 commit 2669894 + df7660f 全部落地）

- G.4.1 SERIES 加 `agui` ✅
- G.4.2 撤回 `tutorial`（方案 A，与 script 对齐）✅
- G.4.3 `form` 字段本轮不消费（待真正按形态路由模板时再做）

### 附加纪律治理（astral 自反省产物）

早期 astral 侧工具存在两处越界后门，一并修正：

1. **scaffold-v2 删 `--series` 后门**（commit 2669894）
   id 前缀是 C.1.2 硬契约，scaffold 不再提供脚本层绕过选项。误用 `--series` 会显式拒并引导 HANDSHAKE 层修正。

2. **mock-missing 停止越界写 pipeline**（commit df7660f）
   原 mock-missing 直接写 `pipeline/<id>/{script,tts}/`，违反 §2"单向写"硬约束。修正：
   - mock-missing 只写 `<astral-root>/.cache/mock/<id>/`
   - scaffold-v2 每项产物两级 fallback：pipeline 优先 → `.cache/mock` 兜底
   - 完成报告打印每项来源（`pipeline` / `mock`）

### agui01 端到端 smoke 已跑通（pipeline 零写入）

```
scriptJson   pipeline
regions      mock       ← pipeline 无，.cache/mock fallback
screenshots  mock       ← pipeline 空目录，fallback
doc          pipeline
durations    mock
subtitles    mock
ttsDir       mock
```

核查 `pipeline/agui01/` 仅 `script/` + `doc/`，astral 全程零写入。

等 tts 出 agui01 真产物后，scaffold 相应项会自动切回 `pipeline` 源，无需再动 astral。


---

## 附录 H · 对 tts-agent-harness 的产物接收契约（2026-04-24）

### 背景

tts-agent-harness 在自己的 web (:3010) / CLI 跑 P1–P6 流水线，产物落 `pipeline/<id>/tts/`。astral-video 下游**只通过文件读取**，**不调 tts HTTP API**。本附录固化下游对产物的接收需求。

### H.1 路径与结构

```
~/projects/astral-pipeline/<id>/tts/
├── durations.json
├── subtitles.json
├── shot01.wav
├── shot02.wav
├── ...
└── .ready           ← 可选，全部写完后 touch
```

### H.2 `durations.json`

```json
[
  { "id": "shot01", "duration_s": 15.62, "file": "shot01.wav" },
  { "id": "shot02", "duration_s": 30.10, "file": "shot02.wav" }
]
```

- `id` 和 `script.json.segments[i].id` 可一一映射（`id=1` → `shot01` 两位补零）
- `duration_s` 正数秒
- `file` 相对 `tts/` 的 wav 文件名

### H.3 `subtitles.json`

```json
{
  "shot01": [
    { "id": "shot01-0", "text": "...", "start": 0.0, "end": 3.2 }
  ],
  "shot02": [ ... ]
}
```

- 顶层 key = shotId
- 每条字幕 `start / end` 是**相对该 shot 的局部秒数**（非全局帧）
- `end` 不超过该 shot 的 `duration_s`；下游 `validate-episodes.js` 检查 ±100ms 容差
- `text` 字段字幕原文（P5 已 strip `[break]` / phoneme 控制标记的结果）

### H.4 wav 文件

- PCM / WAV 任意编码，**可被浏览器原生播放**（Safari + Chrome 都能 decode）
- 采样率无强制（`mock-missing` 产静音 44.1kHz mono 做对齐参考，生产环境任选）
- **必须支持 HTTP Range 请求**——workbench 的 `/api/static/[...path]` 转发 Range 给浏览器 seek；wav 必须是完整静态文件（非 chunked）

### H.5 原子写（HANDSHAKE §2 硬约束）

**每个文件**必须：

```python
write(path + '.tmp')
os.rename(path + '.tmp', path)
```

或等价的 shell `mv`。直接 `open(w)` 会让下游 Vite dev / chokidar 读到半截文件崩。

### H.6 就绪信号（可选但推荐）

全部产物写完后：

```bash
touch ~/projects/astral-pipeline/<id>/tts/.ready
```

- 增量更新（改某 chunk 重写）**重新 touch** 一次（刷新 mtime）
- 下游可借此判断 tts 全套就绪
- 缺失不影响消费（下游按文件存在性判定），只影响明确就绪信号

### H.7 增量更新语义

第二轮微调（改 text 重合成某 chunk / 改字幕时间）：

- 覆盖对应 `shotNN.wav`
- **全量覆盖** `durations.json` 和 `subtitles.json`（不做 patch / merge）
- 下游只认文件整体，无合并逻辑
- 可选：touch `.ready`

### H.8 下游验证（astral 内部，tts 不用管）

`scripts/validate-episodes.js` 自动跑：

- segments 数量对齐（vs script.json.segments）
- subtitles 末尾时间 vs durations 总和（±100ms 容差，超出报 warn / error）
- wav 文件存在 + 可读
- wav 实际时长 vs 声明 duration_s（有 ffprobe 时 ±100ms 检查）

### H.9 非目标（下游明确**不**做）

- ❌ 调 tts HTTP API 查状态 / 触发流水线
- ❌ 在 workbench UI 里显示 tts P1–P6 进度
- ❌ 在 workbench 里一键跑 tts
- ❌ 要求 tts 暴露任何 HTTP endpoint / CORS 配置

workbench 仅负责 **读 pipeline 产物 + Player 预览**；tts 侧的状态监控 / 流水线控制 **仍在 tts web (:3010)** 自己做。

### H.10 当前阻塞（2026-04-24 当时；已解除）

> 状态：✅ 已解除（tts 侧自 2026-04-24 附录 J 起按 H.1-H.7 产出真产物，meta10/agui01/mlknn01-12 均有真 wav）

历史快照：astral 下游**需要 tts 产出真 wav / durations / subtitles**，曾全部期靠 `mock-missing.js` 造哑片 mock 验证画面。

---

**本附录状态**：✅ 已闭环（H.1-H.7 契约稳定使用中，tts 真产物链路打通）

---

## 附录 I · script-agent-harness 对 tts 的产出契约（2026-04-24）

与附录 H 对称：H 定义 tts → astral 的产物接收；本附录定义 script → tts 的产物供应。**tts 只读 pipeline 目录，不调 script HTTP API、不读本仓内 episodes 目录**。

### I.1 tts 从哪读

```
~/projects/astral-pipeline/<id>/
├── script/
│   ├── script.json      ★ 必读
│   ├── regions.json     （tts 可忽略，这是 astral 消费）
│   ├── screenshots/     （同上，tts 可忽略）
│   └── .ready           ★ 就绪信号（mtime，见 I.5）
└── doc/
    └── *.md             （tts 可忽略，astral 消费）
```

tts 只关心 `script/script.json` + `script/.ready`。

### I.2 `script.json` 里 tts 读的字段

tts 只读以下字段，其他忽略：

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 可用于 episode 展示/日志 |
| `segments[]` | ✅ | 主体 |
| `segments[].id` | ✅ | 自增整数 1 开始；建议映射 `shot${pad(id,2)}`（id=1 → shot01） |
| `segments[].type` | ✅ | `hook` / `content` / `cta`，tts 用于 Web UI 分类展示 |
| `segments[].text` | ✅ | **TTS 实际输入**；上游**不含 `[break]` / `[pause]` 等 `[]` 控制标记**（2026-04-19 迁下游决定），tts 自行按 S2-Pro 规则注入 |

上游还有 `description / style / target_duration_s / topic / notes / weakness_notes / comparison_scope / form` 等字段，tts **全部忽略**。新增字段允许（向前兼容），tts 不报错。

**冻结字段**（附录 A.1）：`title` + `segments[].{id, type, topic, text}`——这些字段名 / 语义 / 类型本轮不改不删不重命名。变动触发三方升版 HANDSHAKE。

### I.3 历史遗留：`text` 里可能有 `[pause]`

`CLAUDE.md` 声明 text 已不含 `[]` tag，但 meta10 实测仍有 `[pause]` / `[long pause]` 残留。tts 当前实现里**不读 `ctx.beats`**（见附录 B.1.3），残留无阻塞。agui01 起逐步清理；tts 侧无需关心。

### I.4 tts 产物往哪写

见附录 H.1–H.7，**script 侧不重复定义**。script 与 astral 对 tts 的产物需求**完全对齐**。

### I.5 就绪信号与触发

- script 侧每次 export 会原子写完 `script/*` 后 touch `script/.ready`（mtime = 当前时间）
- tts 侧**建议**按以下方式接入（不强制）：
  - **文件监听**：`chokidar` / `fsnotify` 监听 `pipeline/*/script/.ready` mtime 变化 → 触发 P1
  - **轮询**：tts web 每 N 秒扫 pipeline 发现新 `.ready` mtime → 触发
  - **手动**：tts web 加一个"从 pipeline 拉 episode"按钮
- 第二轮：script 改完 `script.json` 后**重跑 export**（workbench 有按钮 / CLI 可 `node scripts/export-to-pipeline.js <id>`）→ 重 touch `.ready` → tts 侧感知变更

### I.6 当前各 episode 状态（2026-04-24 当时快照；仅决策溯源）

> 状态：⚠️ 历史快照（2026-04-24）。最新 episode 列表请直接看 `~/projects/astral-pipeline/`。

| id | script 侧产出（当时）| 备注 |
|---|---|---|
| `meta10` | 完整（script + regions + 2 screenshots + 3 doc）| dogfood 主力 |
| `meta11` | 部分（script + source，无 regions）| 半成品冻结 |
| `agui01` | **Case 0**（仅 script.json + 2 doc）| 首期 agui 系列 |

tts 可立即开工 meta10（完整）；agui01 等有 text 的 segments 即可跑 TTS（不需要 regions / screenshots）。

### I.7 script 侧对 tts 的请求

回 HANDSHAKE §8 的 4 问是前提，补充 2 问：

1. **新增**：tts 支持 `pipeline/<id>/tts/` 这个路径根目录吗？还是需要约定子结构（如 `tts/<episode>/...`）？
2. **新增**：tts 产物是否暴露 `.ready` 写入的 mtime 作为"这一轮合成完成"的事件锚点？script workbench 会用它显示下游状态。

### I.8 script 侧承诺

- `script.json` 冻结字段不动
- 原子写（`.tmp` → `rename`）+ `.ready` touch 语义保持
- 若 `script.json` 语义变（如加字段），提前一个 HANDSHAKE 附录通知
- 每期 export 幂等：多次导出不累加、不 stale（stale 自动清理）

---

**本附录状态**：✅ 已闭环（tts 在附录 J 回了 §8 四问 + I.7 两新问，联调已通过）

---

## 附录 J · tts-agent-harness 回复 + shot 级增量方案（2026-04-24）

### J.1 §8 四问正式回复

| # | 问 | 答 |
|---|---|---|
| 1 | 产物落位到 `~/projects/astral-pipeline/<id>/tts/`？ | **接**。当前产物在 MinIO + DB，新增 `P7` export task 把拼接 WAV + `durations.json` + `subtitles.json` 落盘。 |
| 2 | 原子写？ | **可做**。每文件先写 `*.tmp` → `os.replace()`；`.ready` 用 `Path.touch()`。 |
| 3 | 监听 `script/.ready` 触发 P1–P6？ | **不做监听，走手动触发**。tts web 加"Import from pipeline"入口（扫 `pipeline/*/script/.ready` 列候选），点击触发 `POST /episodes/from-pipeline {pipeline_id}`。文件监听与 FastAPI 进程模型不匹配，且手动入口对联调调试更友好。 |
| 4 | 全量覆盖还是增量？ | **物理层 JSON 全量，WAV 按需**。JSON 格式天生不支持部分写，每次整体重写（内容里大部分条目和上一版一致）；WAV 按 shot 粒度，仅变化的 shot 覆盖（mtime 刷新），未变的 shot mtime 保持——下游 Vite watcher 对未变文件不 reload。 |

### J.2 I.7 两新问回复

| # | 问 | 答 |
|---|---|---|
| 1 | tts 支持 `pipeline/<id>/tts/` 根目录吗？ | **支持**。直接用 `<id>` 作为 `episodes.id`（现有 schema `episodes.id` 是 Text 主键，零改动承载），产物路径与 id 一一对应。 |
| 2 | `.ready` mtime 作为"合成完成"事件锚点？ | **是**。每次 `P7` export 末尾 `touch .ready`（无论增量/首次）。script workbench 可读此 mtime 作下游状态指示。 |

### J.3 tts 侧 shot 级增量方案（核心，请审核）

**方案全文**：tts-agent-harness `docs/023-pipeline-integration-design.md`。下面为审核摘要。

#### J.3.1 粒度决策

选**shot 级**（= segment 级），不走句级。

- **shot** = 一条 segment（由 `segments[].id` 归一化）
- **chunk** = shot 内按句切出来的一行（P2~P5 合成粒度）
- 一个 shot 含 1..N 个 chunks
- 增量判断基于 `shot_text_hash = sha256(拼接 shot 内所有 chunks.text)`
- shot 内任意一句变化 → 整个 shot 重跑 P2~P6（典型 5~15s 可接受）
- 句级增量暂不做（idx 重排陷阱 + hash 与 idx 耦合，代价高）

#### J.3.2 三个入口的统一语义

所有变更归到一个动作：**`mark_shot_dirty(episode_id, shot_id, new_text?)`**——清该 shot 全部 chunks 的 takes / subtitle_cues / selected_take_id，标 status=pending。

| 入口 | 触发 | 行为 |
|---|---|---|
| **上游 import** | `POST /episodes/from-pipeline {pipeline_id}` | 逐 segment 对比 shot_text：新 shot → 建；text 变 → mark dirty；text 同 → 保留；新 script 里消失的 shot → 删 |
| **当前项目改 text** | Web UI ✎ / `PATCH /chunks/:id {text}` | mark 该 chunk 所属 shot dirty，整 shot 重跑 |
| **当前项目改字幕时间** | Web UI ⏱ / `PATCH /chunks/:id/cues {cues}` | **只更 metadata，不触发重跑**（shot_text_hash 不变，P7 不推 WAV，只重写 subtitles.json） |

#### J.3.3 P7 导出决策

```
last_export = episodes.extra_metadata.last_export  # {shot_id: {shot_text_hash, exported_at}}
for each shot:
  if last.shot_text_hash == 当前 shot_text_hash:
    skip WAV 下载与覆盖（下游 mtime 不变）
  else:
    MinIO 拉 → .tmp → os.replace shotNN.wav
durations.json / subtitles.json 全量重写（原子写）
touch .ready
保存新 last_export
```

#### J.3.4 现有功能兼容性

| 区域 | 影响 |
|---|---|
| `episodes` / `chunks` / `takes` / `events` schema | **零改动** |
| P2 / P2v / P5 / P6 / P6v | **零改动** |
| 上传 script.json 创建 episode（现有入口） | **保留**，与 from-pipeline 并行 |
| ⏱ 字幕时间编辑 | **零改动** |
| Prefect flow 编排 | **小改**（新增 P7 task，不串入现有 flow） |
| **P1**（`p1_chunk.py`） | **中改**：从"删全表重插"改为"对齐 reconciler"。幂等语义从 byte-identical 变为末态收敛 |
| chunk 级 retry | **小改**：触发 mark_shot_dirty，整 shot 重跑 |

#### J.3.5 本轮改造清单

1. `server/core/p1_logic.py` + `server/flows/tasks/p1_chunk.py` 改为 reconciler
2. `server/core/p7_logic.py` + `server/flows/tasks/p7_export.py` 新增
3. `POST /episodes/from-pipeline` / `POST /episodes/:id/export` / `GET /pipeline/available`
4. Web UI："Import from pipeline" 页 + episode 详情页"导出到 pipeline"按钮
5. `tests/test_p1_reconcile.py`（6 对齐 case 覆盖）
6. dogfood：meta10 → agui01

### J.4 tts 反向待 script 确认（1 项，阻塞增量）

**`segments[].id` 在 re-export 时是否稳定？**（即"id=3 始终指同一段话"）

- **保证** → tts 按 shot_id 对齐，未变 shot 零重跑
- **不保证** → tts 无法识别"同一段话"，所有 shot 被视为新 shot，退化为全量重跑（功能不破，仅性能退化）

请在本附录下方直接答复。`agui01` 起步即按"稳定"承诺验证。

### J.5 tts 对 astral 的声明（无反问）

- 完全遵守附录 H 产物契约
- **物理 JSON 全量 + WAV 按 shot 粒度**——相信下游 Vite/Remotion 能按文件 mtime 做局部 HMR，无需额外机制
- 未变 shot 的 WAV mtime 保证不变（通过 `last_export` 命中时跳过 os.replace）

### J.6 D.3 端口清单补齐（依附录 D）

| 端口 | 进程 | 命令 | 可改？ |
|---|---|---|---|
| 3010 | Web UI（Vite dev / prod 静态） | `make serve` / `make open` | 可改（`.env` 的 `WEB_PORT`） |
| 8100 | FastAPI（uvicorn） | `make serve-api` | 可改（`.env` 的 `API_PORT`） |
| 54200 | Prefect 服务 | `make dev` | 可改（`.env` 的 `PREFECT_PORT`） |
| 55432 | PostgreSQL（docker） | `make dev` | 可改（`.env` 的 `POSTGRES_PORT`） |
| 59000 | MinIO API（docker） | `make dev` | 可改（`.env` 的 `MINIO_API_PORT`） |
| 59001 | MinIO Console（docker） | `make dev` | 可改（`.env` 的 `MINIO_CONSOLE_PORT`） |

**WhisperX**：`WHISPERX_MODE=local`，进程内调用，不暴露端口。

**与其他方的冲突判定**（对照 D.2 astral=3000、D.4 script=3456）：
- 无冲突
- API 8100 不在 D.6 建议的 4000-4099 段，但当前无任何其他方占 8100，保持现状

### J.7 落地顺序

1. **等 J.4 确认**（script 答复 segment.id 稳定性）
2. tts 侧按 J.3.5 清单开工（即使 J.4 未定也可开工，破约退化为全量重跑，无功能破坏）
3. meta10 为首个 dogfood（上游已产完整素材）
4. agui01 作为真新素材端到端验证（Case 0 起步，随 script 补齐素材递进）

---

**本附录状态**：✅ 已闭环（script 在附录 L 答了 J.4 id 稳定性承诺，tts 已开工并落地）


---

## 附录 K · astral 对附录 J 的审核反馈（2026-04-24）

### K.0 总评

**APPROVE**。J.3 shot 级增量方案完全对齐附录 H，无阻塞。shot_text_hash + skip-unchanged WAV + mtime 保持 的设计很干净。

### K.1 5 条非阻塞建议

#### K.1.1 skip 分支必须零触碰 wav 文件

J.3.3 中 "skip WAV 下载与覆盖"，请落实为 **完全不 open / read / stat-touching** 目标 wav——某些文件系统在 read 时更新 atime，下游 chokidar 若被配置关注 atime 会误触发刷新。

未变 shot 对应 wav 在整个 export 过程中应**零 IO**。

#### K.1.2 wav 编码格式建议写死

附录 H.4 说"浏览器能播即可"过于宽松。建议 tts 固定产出：

- **44.1 kHz / 16-bit / mono PCM WAV**

好处：
- 下游 `validate-episodes.js` ffprobe 检查有固定基线
- 排查问题时不用先问"这期 wav 什么编码"
- Remotion Player 对 PCM 兼容最稳

立体声 / 其他采样率如有需求再议。

#### K.1.3 `subtitles.json` 顶层 key 统一两位补零

与 `durations.json[].id` 严格对应：

```json
{
  "shot01": [...],
  "shot02": [...],
  "shot10": [...]
}
```

不要 `"shot1"` / `"1"` / `"shot_01"` 等变体。下游按字符串严格匹配。

#### K.1.4 `shot_text_hash` 应包含停顿标记

J.3.1 用 `sha256(chunks.text)`。如果某 shot 的 text 未变但 `[pause]` / `[long pause]` / `[breath]` 等标记调整：
- Fish TTS S2-Pro 输出音频时长会不同
- 但 hash 不变 → skip 重合成 → 输出旧 wav 与新字幕时间错位

建议 hash 的输入 **保留**（而非 strip）这些标记：

```python
shot_text_hash = sha256(''.join(chunk.text for chunk in shot_chunks))
# text 里原样带 [pause] 等，因为它们影响合成
```

（P5 生成字幕时 strip 这些标记是另一个层面，不混淆。）

#### K.1.5 id 大小写严格原样

script 导出的目录若是 `agui01`（小写），tts 写入必须也是 `pipeline/agui01/tts/`。不要规范化成 `AGUI01` 或 `Agui01`。

下游 `/api/static` / `scaffold-v2` 路径严格区分大小写，规范化会导致 404。

### K.2 回答 J.4（segment.id 稳定性）

**不涉及 astral**。下游按 `durations.json[].id` + `subtitles.json` 顶层 key 消费，无论 script 是否保证 id 跨版本稳定，下游都能渲染。

id 稳定性是 script ↔ tts 之间的性能优化契约，与 astral 无关。

### K.3 落地时序（astral 视角）

- tts 按 J.7 开工，**astral 侧零改动**
- 首期真产物（meta10 优先）落到 `pipeline/meta10/tts/` 后，workbench scaffold 自动切 `pipeline` 源
- Player 秒刷出真声音版——无需用户或 astral 做任何操作

### K.4 非阻塞

K.1 5 条都是建议优化，**即使 tts 不采纳也不影响基本功能**（会落进 H.8 的 validate warning 或 shot 增量效率降级）。tts 可自行权衡。

---

**本附录状态**：✅ 已闭环（astral 审核 APPROVE，5 条非阻塞建议 tts 按需采纳）

---

## 附录 L · script 答 J.4 + id 稳定性承诺（2026-04-24）

### L.1 答复 J.4

**`segments[].id` 跨 re-export 稳定——承诺。**

规则硬约束：

| 操作 | 规则 |
|---|---|
| 改 `text` / `topic` / `notes` | **id 不变** |
| 删一段 | **保留 id 空洞**（1,2,4,5 合法） |
| 加新段 | 用 `max(现有 id) + 1`（不填补空洞） |
| **整体推翻重写** | 允许从 1 重排（视同新 episode，tts 退化为全量重跑，**不破坏功能**——J.7.2 已声明） |

CC **禁止**自作主张重排。

### L.2 script 侧已落地

- `CONTRACT.md` `segments[].id` 字段语义加"跨 re-export 稳定"+ 规则表
- `CLAUDE.md` 写稿铁律加一条"segments[].id 稳定性铁律"（与 excerpt 铁律同级）
- `web/app/components/compose/DelegatePrompt.tsx` 委派提示词同步（CC 另起即带入）

### L.3 agui01 首期即按"稳定"执行

agui01 现 10 个 segments，id 1-10 已写定；content CC 清理 notes 时不动 id；后续微调按 L.1。meta10 冻结不再重跑。

### L.4 边界：破约退化

如果未来 CC 违规重排：

- **tts**：shot_text_hash 对不上 → 整 shot 重跑。软退化，不破功能，仅浪费 TTS 调用
- **astral**：`regions.json` key 带 segId，重排让老 regions 指向错 segment → **会错位**，需重画
- 因此破约主要代价在 astral 侧的 regions 失效

规则列在 CLAUDE.md 写稿铁律，CC 一读即知。agui01 起全面生效。

---

**本附录状态**：✅ 已闭环（script L.1 承诺 + L.2 文档落地，agui01 起 id 稳定执行）

---

## 附录 M · script 角色调整：视觉决策剥离（model B，2026-04-24）

### M.1 背景

agui01 实操暴露：CC 在 `script.json.notes` 里预声明 region（`type "excerpt"`）+ 隐式建议截图，做的是"看不到图的视觉决策"——结果是 excerpt 粒度漂移、字幕碎裂、风格不一致。

根因：让 CC（看不到图）做视觉判断不可靠。

### M.2 model B 调整

| 角色 | 调整前 | 调整后 |
|---|---|---|
| **script CC** | 写 text + notes（含 region 声明 / 截图块 / 镜头指令） | 只写 **text + 自由 notes**（字数 / source / 削弱栏 / 想法）；不做任何视觉决策 |
| **workbench 标注员（人）** | 按 CC notes 提示画 coords | 一次决定 `type` + `excerpt` + `coords` 三件事 |
| **astral CC** | 读 regions.json + 渲染 | 不变（多模态自由发挥动画+风格，依然消费 regions.json） |

### M.3 对契约的实际影响

**`regions.json` schema 不变**（type / excerpt / label / note / coords 五字段全保留），astral 消费代码**零改动**。

变的只是 `excerpt` 的来源：

| | 来源 | 字数硬约束 |
|---|---|---|
| 调整前 | CC 在 notes 写，workbench 复制过来 | schema 5-100 |
| 调整后 | 标注员从 `segments[].text` 直接拷整句 | schema 5-100（不变） |

`script.json.notes` 字段从"结构化 region 声明 + 截图块"变为"自由文字"——但下游本来就不消费 `notes`（H.1 / I.2 都明示），astral 端无感知。

### M.4 script 侧已落地

- `CLAUDE.md`：删 v2 notes 区域语法节、删 excerpt 粒度铁律（迁工作台操作约束）、扩项目边界为"任何视觉决策不做"
- `RULES.md`：删"画面指引必须可操作"段
- `CONTRACT.md`：notes 字段语义改"自由文字"；删 v2 区域子语法整节；regions.json `excerpt` 语义改"标注员从 text 拷句"；新增"标注员操作约束"小节
- `DelegatePrompt.tsx`：CC 提示词同步
- `BACKLOG.md`：新增"workbench excerpt picker"待办（提升人画 region 效率）
- 历史归档：删除 `docs/01/02/04/05/06`、`SHOT-SPEC-TRIAL.md`、过期的 `GuidanceModal.tsx`

### M.5 待 astral 动作

**无强制动作**。schema / 消费方式不变。

但建议 astral 知会一下：
- 未来 `regions.json` 的 excerpt 准确度会更高（从 text 直拷而非 CC 写），下游字幕匹配命中率上升
- 历史期 meta01-10 的 regions.json 可能仍有"CC 时期"的非整句 excerpt，astral 现有 fallback 逻辑保持即可

### M.6 待 tts 动作

**无**。tts 不读 regions.json，调整与 tts 无关（I.4 / H 已声明）。

---

**本附录状态**：✅ 已闭环（script M.4 落地，agui01 起按 model B 执行）

---

## 附录 N · tts 侧 P5 cue 越界调查（2026-04-25，tts→astral）

### N.1 背景

tts 侧排查 episode 状态机问题时顺手审了 P5 字幕生成路径（chunk-local cue 写到 `chunks.metadata.subtitle_cues`），发现一个理论上的不变量违反：**P5 word-level 主路径的 `cue.end` 可能 > `take.duration_s`**。

DB 实测越界数据（4/50 chunk）：

| chunk | max_cue_end | take_duration | 越界 |
|---|---|---|---|
| `meta11:shot11:1` | 24.22 | 23.94 | +282ms |
| `FLASH01-v2:shot04:2` | 21.26 | 21.01 | +251ms |
| `agui01:shot06:3` | 15.26 | 15.05 | +213ms |
| `meta11:shot12:1` | 29.92 | 29.87 | +53ms |

根因：`server/core/p5_logic.py:332-334` 的 word-level 主路径直接读 ASR 字符流首尾当 cue 时间，未 clamp 到 `take.duration_s`。fallback 路径（无 ASR 词）`:246-248` 反而显式 clamp 到 `total_duration`——主路径漏了这一步。

### N.2 对下游 validate-episodes.js 的实际影响：**当前不挂**

下游校验是 **整 episode 累加**：
```
delta = sum(durations) - sum(每 shot 内 max(cue.end))
delta < -100ms → error
|delta| ≤ 100ms → pass
delta ∈ (100ms, 5000ms) → warning（"疑似 TTS 末尾静音"，已设计容许）
delta > 5000ms → error
```

实测 4 个 episode 净 delta：

| episode | net_delta_ms | 判定 |
|---|---|---|
| agui01 | +1687 | warning |
| meta11 | +1546 | warning |
| FLASH01-v3 | +1206 | warning |
| FLASH01-v2 | +1126 | warning |

**全部落在 warning 段，不阻塞 CI**。下游已设计的"末尾静音容许"窗口 100ms~5s 把这件事吃了。

进一步：4 个越界 chunk 里只有 `meta11:shot11:1` 是其 shot 的末 chunk（其他 3 个不是末 → cue.end 不进 shot 内 max → 完全不影响下游）。即使修掉 282ms 越界，net_delta 从 +1546 变成 +1828，仍在 warning 段。

### N.3 决定：**当前不修，记入 BACKLOG**

- 不变量"`cue.end ≤ take.duration_s`"应该成立（与 fallback 路径契约对齐），但当前下游不阻塞
- 修了无 metric 收益，工作量 ~95 行（含 P5/P7/PUT route clamp + 数据迁移 + 测试）
- 用户感知层面：Remotion 在 shot 时长终结时停止渲染，越界部分自然被裁，无可见 bug

**触发修复条件**：
1. 下游 `validate-episodes.js` 收紧容差（如改成必须 ±100ms 严格通过），或
2. 某 episode 净 delta 跨过 5s 触发 hard error，或
3. 手动字幕编辑器写出明显越界（PUT `/cues` 路由当前也未 clamp，独立 bug）

### N.4 对 astral / script 的请求

**无**。本附录为 tts 单方调查记录，三方契约不变。

---

**本附录状态**：📝 BACKLOG（tts 单方调查记录，三方契约不变）

---

## 附录 O · tts 侧 P7 跨阶段产物版本一致性加固（2026-04-25，tts→astral）

### O.1 背景

下游闸 5（`scripts/validate-episodes.js` ffprobe 实测 wav vs `durations.json[i].duration_s` ±100ms 严格通过）在 agui01 上失败：

| 项 | 值 |
|---|---|
| `shot10.wav` ffprobe 实测 | **22.274s** |
| `durations.json` 声明 | 27.307s |
| DB take.duration_s | 28.350s |
| 偏差 | **5033ms ≫ 100ms 闸值** |

四个并行 agent 排查（取代原闸 N 的"P5 cue 越界"假设——那是闸 3 的另一个 bug）确认根因**不在任何单一阶段**：

- ✓ P2 全库 662/662 take wav 实测 = DB.duration_s（源头干净）
- ✓ P6 ffmpeg concat sample-accurate 无丢时长（拼接无误）
- ✓ P7 公式正确（compute_shot_segments 无误）
- ✗ **缺跨阶段产物版本一致性检查**：用户重合成换 take 后 final.wav 立刻 stale，没机制 invalidate；P7 用旧 final.wav + 新 take 声明，ffmpeg slice 越过 EOF **静默截断不报错**

时间线（agui01）：
```
04-24 13:01  P6 拼出 final.wav (用当时 take，27.307s for shot10)
04-24 13:18  P7 export，shotNN.wav 一起拍快照
04-25 07:51-08:00  用户重合成 shot07/08/09/10 (新 take，shot10=28.35s)
[P6 没重跑，final.wav 仍是 04-24 版本]
[P7 没重新 export]
此时 DB.take.duration_s 写新 28.35s，但 durations.json 是旧 27.307s，
shot10.wav 是旧 ffmpeg slice 出来的 22.274s。三方互相不认。
```

### O.2 修复方案（已在 tts 主分支落地）

按完整工程流程实施（架构调研 → 设计 → 评审 → 修订 → 复评 → 开发 → QA → 架构师验收 → 业务验收）。

**核心机制**：
1. **`take_set_hash` 指纹**：SHA-256(chunk_id + shot_id + idx + take_id + duration + padding/gap_ms)，episode 级唯一标识当前所有 take 的版本
2. **`episodes.metadata.last_p6_artifact`** 记录 P6 产物 manifest：`{take_set_hash, total_duration_s, ffprobe_duration_s, wav_etag, wav_size_bytes, completed_at, algo_version}`
3. **P6 末尾 9 步原子化**：ffmpeg → ffprobe self-check ±25ms → upload MinIO → head_object → size 校验 + 1 次重传 → 写 metadata（含 wav_etag）→ emit event → 清理
4. **P7 入口检查**：try-acquire `episodes.locked`（503 + Retry-After 5）→ 检查 last_p6_artifact 状态 → STALE 触发自动 P6 重跑（独立 session、二次 hash 比对、最多 1 retry）
5. **P7 ffmpeg slice 后 ffprobe 实测 ±10ms self-check**（比下游 ±100ms 更严，纵深防御）
6. **`plan_exports` skip 联动 take_set_hash**：当 P6 自动重跑或 take_set_hash 变化时强制全切，不复用旧 shot wav

**新 events kind**（astral 团队可关注作为 tts 侧告警信号）：
- `p6_artifact_recorded` — P6 产物正常落库
- `p6_self_check_failed` — P6 ffmpeg 输出与计算时长不一致（应 0 触发）
- `p7_auto_rebuild_p6` — P7 检测到 stale 自动重跑 P6（首次 export 历史 episode 时正常触发一次）
- `p7_slice_mismatch` — P7 slice 实测 vs 声明 > ±10ms（应 0 触发；非 0 说明算法 bug）

**灰度开关** `P7_CONSISTENCY_MODE=warn|enforce`：上线第一周 warn 模式（仅 emit event + WARN log），观察后切 enforce。

### O.3 业务验收结果（agui01）

修复后触发 export，10/10 shot 偏差 < 0.05ms（含用户报告的 shot10 22.274s → 28.350s）。详见 tts 仓 `.planning/p7-fix/BUSINESS-VERIFICATION-v2.md`。

### O.4 对 astral 的影响

**完全透明，无需任何动作**。`durations.json` / `subtitles.json` / `shotNN.wav` 字段格式不变，附录 H 契约不变。区别只是：

- 历史 export 过的 episode（如 agui01）下次 P7 export 会自动跑一次 P6 重建（额外 ~10s），写下 manifest 后续就 fast-path
- 新 episode 首次 export 等同 v1 行为
- 修复后 ffprobe 实测和 durations 声明在每个 shot 上 ±10ms 以内（从前 ±5s）

### O.5 对 astral 的可选请求

**容差收紧（非阻塞）**：astral `validate-episodes.js` 闸 5 当前容差 ±100ms。tts 侧已自检 ±10ms，astral 端如愿可考虑收紧到 ±20ms（保留 1 sample = 22.7μs × 沿途累积余量），把"实测 ≠ 声明"问题更早暴露。**不阻塞**——保持 ±100ms 也完全没事。

### O.6 对 script 的影响

**无**。本附录与 script 仓无关。

### O.7 与附录 N 的关系（说明）

附录 N 调查的是**闸 3**（subtitles 末尾时间 vs durations 总和，±100ms / 5s 容差），是 P5 cue.end > take.duration_s 的越界，决定不修（实测净 delta 全部落 warning 段）。

本附录修的是**闸 5**（ffprobe 实测 vs durations 声明，±100ms 硬规则）。两者是下游 6 道闸里的两道独立闸，是两个独立 bug。

### O.8 commit 信息

tts 仓 `feat/concurrency-optimization` 分支：
- `2d24ce4` fix(p2v): 修 P2v 反馈链 + episode 状态同步 + duration_ratio 降级（前置基础设施）
- `1cb88bb` fix(p7): 跨阶段产物版本一致性 + auto-rebuild + slice self-check（本附录主体，~1600 行 + 43 新增测试 + 设计文档全套）

---

**本附录状态**：✅ 已闭环（tts O.2 + 业务验收 PASS；astral O.5 容差收紧择机响应，非阻塞）
