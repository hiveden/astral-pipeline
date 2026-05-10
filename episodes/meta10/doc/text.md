# meta09 · ThoughtWorks 技术雷达 Vol.34 速览 — text.md

> 形态：FLASH | 系列：meta
> 源文件：tr34_article.md（原文不改，仅做 TTS 机械转换）
> TTS 转换清单：数字→口语（4月15日→四月十五日）、去 markdown 粗体、去脚注标记、去中文引号、括号→破折号/口语衔接、+→加、URL→notes

---

## [hook] 开场 ≈30s

ThoughtWorks 在四月十五日发布了第三十四期技术雷达。【事实】[src: ^1]
这份报告每半年一次，由全球高级技术顾问基于一线项目经验整理，不是市场分析，是实战总结。【事实】[src: ^2]
这一期一共四个主题，全部围绕一个核心命题：在 AI 加速一切的当下，工程团队该坚持什么、放下什么。【事实】[src: ^3]

[画面] TR Vol.34 官网首页 / PDF 封面

## [content] 评估技术本身变难了 ≈60s

雷达原话：在 agentic 时代评估技术，越来越困难。【事实·雷达原话】[src: ^4]

一个原因是语义扩散——新概念冒出的速度，已经超过它们定义稳定的速度。【事实】[src: ^5]
spec-driven development、harness engineering，这些词大家都在用，但每个人用的意思不一样。【事实】[src: ^5]
没有共享定义，就很难判断我们看到的是真正不同的方法，还是同一件事的不同标签。【推断·基于报告延伸】[src: ^5]

另一个原因是工具寿命太短。AI 把造工具的门槛拉到地板，雷达里有些工具上线还不到一个月，单人维护，刚火就死。【事实】[src: ^6]
如果让工具有时间成熟，建议会过时；动作太快，又在追风口。这本身就是 AI 时代的新困境。【事实】[src: ^6]

[画面] themes 页 "The challenge of evaluating technology in an agentic world" 区块截图；语义扩散关键段高亮

## [content] 守住原则，放下模式 ≈80s

这是最反直觉的一个主题：AI 越快，老派工程纪律反而越值钱。【事实·报告主张】[src: ^7]

这一期雷达大量回归老东西——零信任架构、DORA 指标、变异测试、结对编程、clean code、可测试性。【事实】[src: ^8]
甚至连命令行都回潮了，agentic 工具把开发者重新拉回了终端。【事实】[src: ^9]

但雷达明确说这不是怀旧，而是对 AI 速度的必要对冲。【事实·雷达原话】[src: ^7]
同时也要扔掉一些假设：团队怎么组织、反馈循环怎么设计，都得重新想。他们提了一个新词叫 agent 拓扑，跟团队拓扑并列。【事实】[src: ^10]

这一切的根本焦虑是认知债务：AI 写的代码越来越多，人对系统的理解却在掉队。代码可能没问题，但你不知道你的系统里到底跑的是什么。【事实】[src: ^11]
雷达原文那句金句值得抄下来——speed without discipline compounds cost。【事实·雷达原文】[src: ^12]

[画面] themes 页 "Retaining principles, relinquishing patterns" 区块截图；认知债务 blip 页面 thoughtworks.com/radar/techniques/codebase-cognitive-debt

## [content] 给权限饥渴的 agent 套上安全带 ≈80s

第三个主题，是 agent 的安全问题。【事实】

雷达用了一个很形象的说法：permission-hungry——权限饥渴。【事实·报告用语】[src: ^13]
越是值得做的 agent，越想要访问一切：私有数据、外部通信、真实操作权限。每一项都振振有词。【事实】[src: ^13]

但护栏没跟上。Prompt injection 还没解决，模型行为不稳定，agent 会找出各种意料之外的越界路径——没有恶意，纯粹是它就是这么干了。【事实】[src: ^14]
Simon Willison 那个致命三件套——私有数据加不可信内容加外部行动——现在描述的是大多数有用的 agent，而不是少数配置错误的 agent。【事实】[src: ^15]

ThoughtWorks 的判断很明确：未来安全的 agent 系统，不是单体 agent，而是受约束 agent 的流水线，配合强监控。【事实·报告结论】[src: ^16]
零信任、最小权限、纵深防御是底线，但没有银弹。【事实】[src: ^16]

[画面] themes 页 "Securing permission-hungry agents" 区块截图

## [content] 给 coding agent 拴上工程缰绳 ≈82s

最后一个主题是工程层的具体解法：怎么管住 coding agent。【事实】

Agent 越能干，人越想撒手不管。雷达的方案叫 harness engineering——给 agent 套上工程缰绳，分前馈和反馈两层。【事实·报告术语】[src: ^17]

前馈控制：动手前框定行为。Agent Skills 把指令模块化、按需加载；spec-driven development——GitHub Spec-Kit、OpenSpec——用规格驱动 agent 的规划和实现。【事实】[src: ^18]
反馈控制：动手后让 agent 自己纠错。把编译器、linter、type checker、测试套件做成确定性的质量门，失败自动触发重试，人工 review 之前就完成大部分自纠。【事实】[src: ^19]

cargo-mutants、WuppieFuzz、CodeScene 都是这个方向上的具体工具。【事实】[src: ^20]

[画面] themes 页 "Putting coding agents on a leash" 区块截图；Martin Fowler 文章配图 martinfowler.com/articles/harness-engineering.html

## [content] 一句话总结 ≈15s

如果只能记一件事：这一期雷达不在告诉你新工具，而在提醒你 AI 时代的工程纪律没有过时，反而更贵了。【观点·报告主旨总结】

## [cta] 收束 ≈12s

完整版 PDF 五十多页，强烈建议自己翻一遍。【原文】
关注工具人研究所，我们下期见。

---

## 自查备注

- **事实/边界**：全文逐句标注脚注编号，均可追溯至 tr34_article.md 信息源。
- **措辞**：原文措辞不动。TTS 转换仅限数字口语化、去格式标记、括号转口语衔接。
- **姿态**：原文本身为转述体（"雷达原话"/"雷达说"/"ThoughtWorks 的判断"），无教学结论。
- **时长**：原文全量约 6 分钟，不符合典型 FLASH 时长。如需压缩由用户决定裁剪范围。
