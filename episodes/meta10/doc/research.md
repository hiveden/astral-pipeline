# ThoughtWorks 技术雷达 Vol.34 速览

ThoughtWorks 在 4 月 15 日发布了第 34 期技术雷达[^1]。这份报告每半年一次，由全球高级技术顾问基于一线项目经验整理[^2]，不是市场分析，是实战总结。这一期一共四个主题[^3]，全部围绕一个核心命题：在 AI 加速一切的当下，工程团队该坚持什么、放下什么。

## 一、评估技术本身变难了

雷达原话：在 agentic 时代评估技术，越来越困难[^4]。

一个原因是"语义扩散"——新概念冒出的速度，已经超过它们定义稳定的速度。spec-driven development、harness engineering，这些词大家都在用，但每个人用的意思不一样[^5]。没有共享定义，就很难判断我们看到的是真正不同的方法，还是同一件事的不同标签[^5]。

另一个原因是工具寿命太短。AI 把造工具的门槛拉到地板，雷达里有些工具上线还不到一个月，单人维护，刚火就死[^6]。如果让工具有时间成熟，建议会过时；动作太快，又在追风口[^6]。这本身就是 AI 时代的新困境。

## 二、守住原则，放下模式

这是最反直觉的一个主题：AI 越快，老派工程纪律反而越值钱[^7]。

这一期雷达大量回归"老东西"——零信任架构、DORA 指标、变异测试、结对编程、clean code、可测试性[^8]。甚至连命令行都回潮了，agentic 工具把开发者重新拉回了终端[^9]。

但雷达明确说这不是怀旧，而是对 AI 速度的必要对冲[^7]。同时也要扔掉一些假设：团队怎么组织、反馈循环怎么设计，都得重新想。他们提了一个新词叫"agent 拓扑"，跟"团队拓扑"并列[^10]。

这一切的根本焦虑是**认知债务**：AI 写的代码越来越多，人对系统的理解却在掉队。代码可能没问题，但你不知道你的系统里到底跑的是什么[^11]。雷达原文那句金句值得抄下来——*speed without discipline compounds cost*[^12]。

## 三、给"权限饥渴"的 agent 套上安全带

第三个主题，是 agent 的安全问题。

雷达用了一个很形象的说法：**permission-hungry**——权限饥渴。越是值得做的 agent，越想要访问一切：私有数据、外部通信、真实操作权限。每一项都振振有词[^13]。

但护栏没跟上。Prompt injection 还没解决，模型行为不稳定，agent 会找出各种意料之外的越界路径——没有恶意，纯粹是"它就是这么干了"[^14]。Simon Willison 那个"致命三件套"（私有数据 + 不可信内容 + 外部行动）现在描述的是大多数有用的 agent，而不是少数配置错误的 agent[^15]。

ThoughtWorks 的判断很明确：未来安全的 agent 系统，不是单体 agent，而是**受约束 agent 的流水线**，配合强监控[^16]。零信任、最小权限、纵深防御是底线，但没有银弹[^16]。

## 四、给 coding agent 拴上工程缰绳

最后一个主题是工程层的具体解法：怎么管住 coding agent。

Agent 越能干，人越想撒手不管。雷达的方案叫 **harness engineering**——给 agent 套上工程缰绳，分前馈和反馈两层[^17]：

- **前馈控制**：动手前框定行为。Agent Skills 把指令模块化、按需加载；spec-driven development（GitHub Spec-Kit、OpenSpec）用规格驱动 agent 的规划和实现[^18]。
- **反馈控制**：动手后让 agent 自己纠错。把编译器、linter、type checker、测试套件做成确定性的质量门，失败自动触发重试，人工 review 之前就完成大部分自纠[^19]。

cargo-mutants、WuppieFuzz、CodeScene 都是这个方向上的具体工具[^20]。

## 一句话总结

如果只能记一件事：**这一期雷达不在告诉你新工具，而在提醒你 AI 时代的工程纪律没有过时，反而更贵了。**

完整版 PDF 五十多页，强烈建议自己翻一遍：
https://www.thoughtworks.com/radar

---

## 信息源

下面除特别说明外，"themes 页"均指 https://www.thoughtworks.com/radar 滚动到 **Themes for this volume** 区块。

[^1]: 发布日期与版本号。PR 稿首行 "CHICAGO, April 15, 2026 ... volume 34" — https://www.prnewswire.com/news-releases/as-ai-accelerates-software-complexity-thoughtworks-technology-radar-urges-a-return-to-engineering-fundamentals-to-combat-cognitive-debt-302737210.html

[^2]: "twice-yearly snapshot ... based on our global teams' experience"。雷达首页首屏说明段第一句 — https://www.thoughtworks.com/radar

[^3]: 本期四个主题（按官网顺序）：The challenge of evaluating technology in an agentic world / Retaining principles, relinquishing patterns / Securing permission-hungry agents / Putting coding agents on a leash。themes 页四个 H2 标题。

[^4]: "evaluating technology is becoming harder as the industry adopts AI"。themes 页 **The challenge of evaluating technology in an agentic world** 区块第一段第二句。

[^5]: 语义扩散定义 + spec-driven development / harness engineering 用法不一致。同上区块第一段第三-五句。

[^6]: "tools that were less than a month old ... maintained by a single contributor" + 评估节奏两难。同上区块第二段。

[^7]: "this is not nostalgia, but a necessary counterweight to the speed at which AI tools can generate complexity"。themes 页 **Retaining principles, relinquishing patterns** 区块第一段倒数第二句。

[^8]: 回归 pair programming / zero trust / mutation testing / DORA / clean code / testability。同上区块第一段第二-三句。

[^9]: "resurgence of the command line ... agentic tools are bringing developers back to the terminal"。同上区块第一段最后一句。

[^10]: "agent topologies alongside team topologies"。同上区块第二段第三句。

[^11]: 认知债务定义。themes 页 **The challenge of evaluating technology in an agentic world** 区块第三段。Blip 详情页：https://www.thoughtworks.com/radar/techniques/codebase-cognitive-debt

[^12]: "speed without discipline compounds cost"。themes 页 **Retaining principles, relinquishing patterns** 区块第三段最后一句。

[^13]: "Permission hungry" 定义 + agent 需要访问私有数据/外部通信/真实系统。themes 页 **Securing permission-hungry agents** 区块第一段。

[^14]: prompt injection 区分不了输入 + agent 越界行为。同上区块第二段第三句及最后一句。

[^15]: Simon Willison "lethal trifecta" 定义。同上区块第二段第四句，引用自 https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/

[^16]: "pipelines of more constrained agents, with strong monitoring and control" + zero trust / least privilege / defense in depth。同上区块第三段第一-二句。

[^17]: "coding agent harnesses: controls that guide agents' behavior before code is generated and provide feedback afterwards"。themes 页 **Putting coding agents on a leash** 区块第一段第二句。原文链接 Martin Fowler 站：https://martinfowler.com/articles/harness-engineering.html

[^18]: Feedforward / Agent Skills / spec-driven development / GitHub Spec-Kit / OpenSpec。同上区块第二段。Blip 页：https://www.thoughtworks.com/radar/techniques/agent-skills 、https://www.thoughtworks.com/radar/techniques/spec-driven-development 、https://www.thoughtworks.com/radar/languages-and-frameworks/github-spec-kit

[^19]: Feedback controls / 编译器、linter、type checker、测试套件 / 失败自动触发纠错。同上区块第三段第一-二句。Blip 页：https://www.thoughtworks.com/radar/techniques/feedback-sensors-for-coding-agents

[^20]: cargo-mutants / WuppieFuzz / CodeScene 作为反馈层工具示例。同上区块第三段中段。Blip 页：https://www.thoughtworks.com/radar/tools/cargo-mutants 、https://www.thoughtworks.com/radar/tools/wuppiefuzz 、https://www.thoughtworks.com/radar/tools/codescene
