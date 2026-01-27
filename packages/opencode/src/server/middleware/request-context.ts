/**
 * Request Context Middleware - Hono 中间件
 *
 * 将 HTTP 请求的 cookies 注入到 RequestContext 中，
 * 使得后续的 MCP 工具调用可以获取到认证信息。
 *
 * 使用方式：
 * ```ts
 * import { requestContextMiddleware } from "./middleware/request-context"
 *
 * app.use(requestContextMiddleware())
 * ```
 */

import type { MiddlewareHandler } from "hono"
import { RequestContext } from "../../request-context"

export function requestContextMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const cookies = c.req.header("cookie")
    const metadata: Record<string, unknown> = {}

    // 可以从其他 headers 提取元数据
    const userId = c.req.header("x-user-id")
    if (userId) metadata.userId = userId

    const traceId = c.req.header("x-trace-id")
    if (traceId) metadata.traceId = traceId

    return RequestContext.provide({ cookies, metadata }, () => next())
  }
}
