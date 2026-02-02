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
import { Flag } from "../../flag/flag"

/** 需要透传给下游调用的 headers 列表（cookie 和 x-organization 单独处理） */
const PASSTHROUGH_HEADERS = ["x-trace-id", "x-request-id"] as const

export function requestContextMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    // 收集需要透传的 headers
    const headers: Record<string, string> = {}

    // cookie 特殊处理：本地开发模式优先使用环境变量
    const cookie = Flag.OPENCODE_DEV_COOKIES || c.req.header("cookie")
    if (cookie) headers.cookie = cookie

    // x-organization 特殊处理：本地开发模式优先使用环境变量
    const organization = Flag.OPENCODE_DEV_ORGANIZATION || c.req.header("x-organization")
    if (organization) headers["x-organization"] = organization

    // 其他 headers
    for (const name of PASSTHROUGH_HEADERS) {
      const value = c.req.header(name)
      if (value) headers[name] = value
    }

    // 获取请求来源 URL（用于 cookie 域名校验）
    // 优先级：
    // 1. 环境变量 OPENCODE_COOKIE_SOURCE_URL（用于本地开发）
    // 2. Origin header
    // 3. Referer header
    // 4. Host header
    const origin = c.req.header("origin")
    const referer = c.req.header("referer")
    const host = c.req.header("host")
    const protocol = c.req.header("x-forwarded-proto") || "https"

    let sourceUrl: string | undefined
    if (Flag.OPENCODE_COOKIE_SOURCE_URL) {
      // 本地开发时通过环境变量覆盖
      sourceUrl = Flag.OPENCODE_COOKIE_SOURCE_URL
    } else if (origin) {
      sourceUrl = origin
    } else if (referer) {
      try {
        const url = new URL(referer)
        sourceUrl = url.origin
      } catch {
        // ignore
      }
    } else if (host) {
      sourceUrl = `${protocol}://${host}`
    }

    return RequestContext.provide({ sourceUrl, headers }, () => next())
  }
}
