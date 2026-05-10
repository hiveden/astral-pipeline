# AG-UI 心智模型

> 信息源
> - 官方: https://docs.ag-ui.com/introduction
> - 本地原文: `~/projects/_agui-docs-readings/ag-ui/docs/introduction.mdx`

## 定义

AG-UI 是开放、轻量、基于事件的协议，标准化 AI agent 与用户侧应用之间的连接，提供双向通道传递 agent 状态、UI 意图与用户交互[^overview]。

## 协议形状

AG-UI 通信不是请求/响应，而是事件流——agent 向 UI 连续发事件，UI 通过反向通道回传用户输入、中断、审批[^event-shape]：

```
Agent ──event──event──event──event──▶  UI
                                         │
UI ────────────用户输入 / 中断────────────┘
```

主流方向 Agent → UI（连续事件），反向通道 UI → Agent（用户输入、中断、审批）。完整事件类型见 [concepts/events](https://docs.ag-ui.com/concepts/events)。

## 三个 Agentic 协议的分层

AG-UI 是三个主流开放 agentic 协议之一，各自覆盖不同层面[^protocols]。

| 层 | 协议 | 职责 | 起源 |
|---|---|---|---|
| Agent ↔ User Interaction | AG-UI | 连接 agent 与用户侧应用，支持实时、多模态、交互式体验 | CopilotKit |
| Agent ↔ Tools & Data | MCP | agent 安全接入外部系统、工具、数据源 | Anthropic |
| Agent ↔ Agent | A2A | agent 在分布式系统中协作与分工 | Google |

三协议在一个 agent 上的位置关系：

```
       ┌─────────────────┐
       │  用户 (前端 UI)  │
       └────────┬────────┘
                │
                │   AG-UI  (事件流：SSE / WebSocket)
                │
       ┌────────┴────────┐
       │      Agent       │
       └────┬────────┬────┘
            │        │
          MCP       A2A
            ▼        ▼
         工具/数据   其它 Agent
```

关于 A2UI：A2UI 与 AG-UI 不是同一协议。A2UI 是 generative UI 规范（让 agent 投递 UI 组件），AG-UI 是 Agent ↔ 用户交互协议（连接 agentic 前端与任意 agentic 后端）。二者互补[^a2ui]。

## Why Agentic Apps Need AG-UI

Agentic 应用打破了前 agentic 时代的请求/响应模型：客户端发请求、服务端返数据、客户端渲染、交互结束[^why-agentic]。

Agent 具备以下特性，导致传统 REST/GraphQL API 难以承载[^agent-chars]：

- 长任务（long-running）并流式输出（stream）中间过程，通常跨多轮会话
- 非确定性（nondeterministic），可以非确定地控制应用 UI
- 同时混合结构化与非结构化 IO（文本与语音，以及 tool call、状态更新）
- 需要用户可交互的组合（composition），可能递归调用子 agent

AG-UI 是基于事件的协议，建立在 Web 基础协议（HTTP、WebSockets）之上，作为面向 agentic 时代的抽象层[^abstraction-layer]。

## Building Blocks

官方 Overview 列出的 13 个能力[^blocks]：

| 能力 | 说明 |
|---|---|
| Streaming chat | token 与事件流式下发，支持取消与恢复 |
| Multimodality | 带类型的附件与实时媒体（文件、图片、音频、转写） |
| Generative UI, static | 将模型输出渲染为稳定的、带类型的组件 |
| Generative UI, declarative | 小型声明式语言，agent 提议组件树，应用校验并挂载 |
| Shared state | 只读/读写的共享 store，事件源的流式 diff 与冲突解决 |
| Thinking steps | 从 trace 与工具事件可视化中间推理 |
| Frontend tool calls | agent 与前端动作之间的带类型握手 |
| Backend tool rendering | 在应用和对话中可视化后端工具输出 |
| Interrupts (HITL) | 流程中途暂停、批准、编辑、重试、升级，不丢状态 |
| Sub-agents and composition | 嵌套委派，带 scoped state、tracing、cancellation |
| Agent steering | 用实时用户输入动态引导 agent 执行 |
| Tool output streaming | 流式工具结果与日志 |
| Custom events | 协议未覆盖场景的开放数据通道 |

## Supported Integrations

官方列出的集成分类[^integrations]：

- Direct to LLM
- Agent Framework Partnerships：LangGraph、CrewAI
- Agent Framework 1st Party：Microsoft Agent Framework、Google ADK、AWS Strands、AWS Bedrock AgentCore、Mastra、Pydantic AI、Agno、LlamaIndex、AG2
- Agent Framework Community（In Progress）：OpenAI Agent SDK、Cloudflare Agents
- Agent Interaction Protocols：A2A Middleware
- Infrastructure / Deployment：Amazon Bedrock AgentCore
- Specification：Oracle Agent Spec
- SDKs：Kotlin、Go、Dart、Java、Rust（.NET、Nim、Flowise、Langflow 在途）
- Clients：CopilotKit、Terminal + Agent（React Native Help Wanted）

## QA

### Q1：一句话如何概括 AG-UI？

AG-UI 是 agent ↔ 用户侧应用的事件流协议，主流方向为 Agent → UI（连续事件下发），反向通道承载用户输入、中断、审批。

### Q2：AG-UI 与 A2UI 容易混淆，怎么区分？

名字相近但不是同一层。A2UI 是 generative UI 规范，定义 agent 如何把 UI 组件投递到前端；AG-UI 是通信协议，定义 agent 与前端之间的事件流格式。在 AG-UI 连接上可以承载 A2UI 形式的组件下发。

### Q3：4 个 agent 特性具体怎么理解？

官方 "Why Agentic Apps need AG-UI" 下的 4 条特性[^agent-chars]逐条拆解。

**long-running + streaming**：一次 agent 回合可能持续数秒到数分钟（LLM 推理 + 工具调用 + 多步思考），中间过程需要边产生边下发——token 级流式文字、工具调用起止、中间推理步骤、状态变更。REST 的一次性返回模型无法承载这种形态。AG-UI 用事件流 + 专门事件类型承载"开始/中间/结束"三阶段。

**nondeterministic + controls UI nondeterministically**：含两层。一是输出不确定——同一问题两次调用结果、调用的工具、返回字段可能不同；二是 agent 主动决定本回合渲染什么组件（这次返图表、下次返表单、再下次返确认按钮），UI 形态本身是 agent 输出的一部分，前端无法预先知道 schema。AG-UI 对应方案是 Generative UI（静态与声明式两种）。

**structured + unstructured IO mixed**：一次响应同时包含流式文字（非结构化）、工具调用参数（结构化 JSON）、状态 delta、语音/图片/附件、思考步骤，且时间上交错——文字片段 → tool call start → tool call args → 状态更新 → 文字片段 → tool call end。传统 Content-Type 一次响应一种类型，混合只能走自定义 multipart 或 ad-hoc 包裹。AG-UI 用统一事件模型，不同类型内容对应不同事件 type，共用一条流。

**user-interactive composition**：一个任务可能递归调用子 agent，形成执行树；用户可在中途介入——审批子步骤、修改参数、中断分支、查看执行树。REST 是扁平的 req/res，没有会话树的一等概念。AG-UI 把 sub-agent 调用、作用域状态、取消、追踪作为一等公民。详见 `concepts/agents`。

四条对应的维度：

| 维度 | 传统 Web | Agent |
|---|---|---|
| 时间 | 一次性 | 持续 + 流式 |
| 输出 | 预定义 schema | 非确定 + 动态 UI |
| 数据 | 单类型 | 多类型交错 |
| 结构 | 扁平 req/res | 递归执行树 |

### Q4：SSE 和 WebSocket 是什么？

AG-UI 事件流的两种底层传输，均为 Web 标准。

**SSE（Server-Sent Events）**[^sse]：

- 方向：单向，服务器 → 浏览器
- 底层：HTTP 长连接，`Content-Type: text/event-stream`
- 客户端：浏览器原生 `EventSource`，内置自动重连
- 报文格式示例：

  ```
  event: message
  data: {"type":"TEXT_MESSAGE_CONTENT","delta":"hello"}
  ```

**WebSocket**[^websocket]：

- 方向：双向全双工
- 底层：HTTP 升级握手（`Upgrade: websocket`）后转为独立帧协议
- 客户端：浏览器原生 `WebSocket`
- 重连需自行实现

对比：

| 维度 | SSE | WebSocket |
|---|---|---|
| 方向 | 单向（S→C） | 双向 |
| 底层 | HTTP | 独立协议 |
| 重连 | 浏览器自动 | 需自行实现 |
| 代理/防火墙友好度 | 高 | 中 |
| 报文格式 | 纯文本 | 文本或二进制帧 |

AG-UI 两种都支持[^abstraction-layer]。多数 agent 场景 SSE 足够（agent 下发为主，用户输入走另一个 POST）；需要密集双向交互（实时 steering、语音双工）时选 WebSocket。排查事件流断连时，优先检查反向代理（Nginx、Cloudflare）对长连接的 buffer 与超时配置。

### Q5：后续章节的地图？

Building blocks 表格中每一项对应后续 `concepts/` 或 `drafts/` 下的章节，可作为学习路径的索引。

### Q6：本章学到的最小集

1. **位置**：AG-UI 在三协议中位于 Agent ↔ User 层
2. **形状**：事件流，不是 request/response
3. **理由**：传统 REST/GraphQL 扛不住 agent 的 4 个特性（长任务流式、非确定、IO 混合、可交互组合）
4. **学习路径**：13 个 building blocks 对应后续章节

---

[^overview]: **EN** — AG-UI is an open, lightweight, event-based protocol that standardizes how AI agents connect to user-facing applications. It is designed to be the general-purpose, bi-directional connection between a user-facing application and any agentic backend.<br>**中** — AG-UI 是开放、轻量、基于事件的协议，标准化 AI agent 与用户侧应用的连接。它被设计为用户侧应用与任意 agentic 后端之间的通用双向连接。<br>参考：<https://docs.ag-ui.com/introduction>

[^protocols]: **EN** — AG-UI is one of three prominent open agentic protocols. Agent ↔ User Interaction: AG-UI. Agent ↔ Tools & Data: MCP (originated by Anthropic). Agent ↔ Agent: A2A (originated by Google).<br>**中** — AG-UI 是三个主流开放 agentic 协议之一。Agent ↔ 用户交互：AG-UI；Agent ↔ 工具与数据：MCP（源自 Anthropic）；Agent ↔ Agent：A2A（源自 Google）。<br>参考：<https://docs.ag-ui.com/introduction#agentic-protocols>

[^a2ui]: **EN** — Despite naming similarities, A2UI and AG-UI are different and work well together. A2UI is a generative UI specification allowing agents to deliver UI widgets; AG-UI is the Agent ↔ User Interaction protocol connecting an agentic frontend to any agentic backend.<br>**中** — A2UI 与 AG-UI 名字相近但不同，可协作。A2UI 是 generative UI 规范，让 agent 投递 UI 组件；AG-UI 是 Agent ↔ 用户交互协议，连接 agentic 前端与任意 agentic 后端。<br>参考：<https://docs.ag-ui.com/introduction#agentic-protocols>

[^why-agentic]: **EN** — Agentic applications break the simple request/response model that dominated frontend-backend development in the pre-agentic era: a client makes a request, the server returns data, the client renders it, and the interaction ends.<br>**中** — Agentic 应用打破了前 agentic 时代主导前后端开发的简单请求/响应模型：客户端发请求、服务端返数据、客户端渲染、交互结束。<br>参考：<https://docs.ag-ui.com/introduction#why-agentic-apps-need-ag-ui>

[^agent-chars]: **EN** — Agents exhibit characteristics challenging for traditional REST/GraphQL APIs: long-running and stream intermediate work across multi-turn sessions; nondeterministic, can control application UI nondeterministically; mix structured + unstructured IO (text, voice, tool calls, state updates); need user-interactive composition (may call sub-agents recursively).<br>**中** — Agent 的特性让传统 REST/GraphQL 难以承载：长任务、流式输出中间过程，跨多轮会话；非确定性，可非确定地控制应用 UI；混合结构化与非结构化 IO（文本、语音、tool call、状态更新）；需要用户可交互的组合能力，可递归调用子 agent。<br>参考：<https://docs.ag-ui.com/introduction#why-agentic-apps-need-ag-ui>

[^abstraction-layer]: **EN** — AG-UI is an event-based protocol that enables dynamic communication between agentic frontends and backends. It builds on top of the foundational protocols of the web (HTTP, WebSockets) as an abstraction layer designed for the agentic age.<br>**中** — AG-UI 是基于事件的协议，让 agentic 前后端之间动态通信。它建立在 Web 基础协议（HTTP、WebSockets）之上，作为面向 agentic 时代的抽象层。<br>参考：<https://docs.ag-ui.com/introduction#why-agentic-apps-need-ag-ui>

[^blocks]: **EN** — Building blocks (today & upcoming) — 13 items: Streaming chat, Multimodality, Generative UI (static), Generative UI (declarative), Shared state, Thinking steps, Frontend tool calls, Backend tool rendering, Interrupts (human in the loop), Sub-agents and composition, Agent steering, Tool output streaming, Custom events.<br>**中** — Building blocks（现有 + 规划中）共 13 项：流式聊天、多模态、静态 Generative UI、声明式 Generative UI、共享状态、思考步骤、前端工具调用、后端工具渲染、中断（HITL）、子 agent 与组合、agent 引导、工具输出流式、自定义事件。<br>参考：<https://docs.ag-ui.com/introduction#building-blocks-today--upcoming>

[^integrations]: **EN** — Supported Integrations: Direct to LLM; Agent Framework Partnerships (LangGraph, CrewAI); Agent Framework 1st Party (Microsoft Agent Framework, Google ADK, AWS Strands, AWS Bedrock AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, AG2); Agent Interaction Protocols (A2A Middleware); Infrastructure (Amazon Bedrock AgentCore); Specification (Oracle Agent Spec); SDKs (Kotlin, Go, Dart, Java, Rust, etc.); Clients (CopilotKit, Terminal + Agent).<br>**中** — 已支持集成：直连 LLM；Agent 框架合作伙伴（LangGraph、CrewAI）；Agent 框架 1st Party（Microsoft Agent Framework、Google ADK、AWS Strands、AWS Bedrock AgentCore、Mastra、Pydantic AI、Agno、LlamaIndex、AG2）；Agent 交互协议（A2A Middleware）；基础设施（Amazon Bedrock AgentCore）；规范（Oracle Agent Spec）；SDK（Kotlin、Go、Dart、Java、Rust 等）；客户端（CopilotKit、Terminal + Agent）。<br>参考：<https://docs.ag-ui.com/introduction#supported-integrations>

[^sse]: **EN** — Server-Sent Events (SSE): a server pushes a stream of text events to the browser over a single long-lived HTTP response (`Content-Type: text/event-stream`). Unidirectional (server → client). Browser exposes it as `EventSource` with built-in auto-reconnect.<br>**中** — SSE：服务器通过一个长时间不关闭的 HTTP 响应向浏览器推送文本事件流，单向（服务器 → 客户端）。浏览器原生 `EventSource` API，内置自动重连。<br>参考：<https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>

[^websocket]: **EN** — WebSocket: after an HTTP upgrade handshake (`Upgrade: websocket`), the connection becomes a bidirectional, full-duplex frame-based channel independent of HTTP. Defined in RFC 6455.<br>**中** — WebSocket：通过 HTTP 升级握手后，连接变为独立于 HTTP 的双向、全双工、基于帧的通道。由 RFC 6455 定义。<br>参考：<https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API>

[^event-shape]: **EN** — AG-UI is an event-based protocol where agents stream typed events to the UI, with a reverse channel for user input, interrupts, and approvals. <br> **中** — AG-UI 是基于事件的协议，agent 向 UI 流式发送具名事件，反向通道承载用户输入、中断与审批。 <br> 参考：<https://docs.ag-ui.com/concepts/events>
