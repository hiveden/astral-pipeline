# 三协议位置（测试 fixture）

> 信息源（虚构占位）
> - 官方：https://docs.example.com/protocols
> - 本地原文：测试 fixture，无真实原文

## 三协议分层

Agentic 生态三个主流开放协议，各覆盖一层：

| 层 | 协议 | 连接对象 |
|---|---|---|
| Agent ↔ Tools | MCP | 工具 / 上下文 |
| Agent ↔ Agent | A2A | 其它 agent |
| Agent ↔ User | AG-UI | 用户侧应用 |

三条线正交，互不干扰。

## AG-UI 形状

事件流，不是请求/响应。主流方向 agent → UI 连续发事件。底层可选 SSE 或 WebSocket，多数场景 SSE 足够，覆盖率约 90%。

## 收束

三协议各管一层，不混着用[^1]。

---

[^1]: **测试用脚注** —— 验证 [src: ^1] 引用机制。<br>参考：https://docs.example.com/protocols
