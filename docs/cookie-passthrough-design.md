# Cookie 透传设计

## 背景

opencode 作为 Web 服务部署时，需要将用户请求中的 Cookie 安全地透传给 MCP 服务器。

## 核心问题

1. **安全性**：Cookie 只能发送给匹配域名的 MCP 服务器（防止泄露）
2. **解耦性**：尽量不修改 opencode 原生代码

## 架构

```
HTTP Request (带 Cookie)
       ↓
┌──────────────────────────────┐
│  requestContextMiddleware    │  ← 提取 Cookie，存入 AsyncLocalStorage
└──────────────────────────────┘
       ↓
┌──────────────────────────────┐
│     RequestContext           │  ← 请求级上下文管理
│  ├─ sourceUrl (来源域名)      │
│  └─ cookies                  │
└──────────────────────────────┘
       ↓
┌──────────────────────────────┐
│     McpContext.createFetch   │  ← 包装 fetch，注入 Cookie
└──────────────────────────────┘
       ↓
┌──────────────────────────────┐
│     CookieStore              │  ← RFC 6265 域名校验
└──────────────────────────────┘
       ↓
MCP Server (只收到匹配域名的 Cookie)
```

## 新增文件

| 文件 | 职责 |
|------|------|
| `mcp/cookie-store.ts` | Cookie 管理，基于 tough-cookie 做域名校验 |
| `request-context/index.ts` | AsyncLocalStorage 封装，存储请求上下文 |
| `mcp/context.ts` | 创建带 Cookie 注入的 fetch |
| `server/middleware/request-context.ts` | Hono 中间件，提取请求信息 |

## 修改的原生文件

| 文件 | 修改 |
|------|------|
| `mcp/index.ts` | transport 使用 `McpContext.createFetch()` |
| `server/server.ts` | 添加 `requestContextMiddleware()` |
| `flag/flag.ts` | 添加 3 个开发模式 flag |

## 环境变量

| 变量 | 用途 |
|------|------|
| `OPENCODE_DEV_COOKIES` | 本地开发注入 Cookie |
| `OPENCODE_DEV_ORGANIZATION` | 本地开发注入 x-organization |
| `OPENCODE_COOKIE_SOURCE_URL` | 覆盖 Cookie 来源域名 |
