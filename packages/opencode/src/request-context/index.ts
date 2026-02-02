/**
 * Request Context - 请求级别的上下文管理
 *
 * 用于在请求生命周期内传递上下文信息（如 cookies），
 * 使得下游调用（MCP、LLM Provider 等）可以获取到原始请求的认证信息。
 *
 * 设计原则：
 * 1. 完全解耦 - 不修改任何开源核心代码
 * 2. 可选使用 - 如果没有设置上下文，不影响原有功能
 * 3. 单一职责 - 只负责请求上下文的存储和获取
 * 4. 高内聚 - cookie 注入逻辑集中在此模块
 */

import type { CookieJar } from "tough-cookie"
import { Context } from "../util/context"
import { CookieStore } from "../mcp/cookie-store"
import { Log } from "../util/log"

const log = Log.create({ service: "request-context" })

export interface RequestContextData {
  /** 请求来源 URL（用于 cookie 域名校验） */
  sourceUrl?: string
  /**
   * 需要透传给下游调用的 headers
   * - cookie: 特殊处理，会进行域名校验
   * - 其他 headers: 直接透传
   */
  headers?: Record<string, string>
  /** 缓存的 CookieJar（懒加载） */
  jar?: CookieJar
}

const requestContext = Context.create<RequestContextData>("request")

export namespace RequestContext {
  /**
   * 在请求处理函数中提供上下文
   * @example
   * ```ts
   * RequestContext.provide({ cookies: req.headers.cookie }, async () => {
   *   // 在这个作用域内，下游调用可以获取到 cookies
   *   await processRequest()
   * })
   * ```
   */
  export function provide<R>(data: RequestContextData, fn: () => R): R {
    return requestContext.provide(data, fn)
  }

  /**
   * 获取当前请求的上下文（如果存在）
   * 不抛出异常，返回 undefined 表示没有上下文
   */
  export function get(): RequestContextData | undefined {
    try {
      return requestContext.use()
    } catch {
      return undefined
    }
  }

  /**
   * 获取当前请求的来源 URL
   */
  export function sourceUrl(): string | undefined {
    return get()?.sourceUrl
  }

  /**
   * 获取需要透传的 headers
   */
  export function headers(): Record<string, string> | undefined {
    return get()?.headers
  }

  /**
   * 获取当前请求的 cookies（从 headers 中提取）
   */
  export function cookies(): string | undefined {
    return get()?.headers?.cookie
  }

  /**
   * 获取目标 URL 的 cookies（经过域名校验）
   * 使用 tough-cookie 进行 RFC 6265 标准的域名校验
   *
   * @param targetUrl 目标 URL
   * @returns cookie 字符串或 undefined
   */
  export async function getCookiesForUrl(targetUrl: string): Promise<string | undefined> {
    const ctx = get()
    const cookies = ctx?.headers?.cookie
    const source = ctx?.sourceUrl
    if (!cookies || !source) return undefined

    // 懒加载 jar，同一请求内复用
    if (!ctx.jar) {
      ctx.jar = await CookieStore.createJar(cookies, source)
    }

    return CookieStore.getCookiesForUrl(ctx.jar, targetUrl)
  }

  /**
   * 创建一个带有 cookie 注入的 fetch 函数
   * 自动从 RequestContext 获取 cookies 并进行域名校验
   *
   * @param baseFetch 基础 fetch 函数（可选，默认使用全局 fetch）
   * @returns 包装后的 fetch 函数
   */
  export function createFetch(baseFetch?: typeof fetch): typeof fetch {
    const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const targetUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const cookieHeader = await getCookiesForUrl(targetUrl)

      const reqHeaders = new Headers(init?.headers)
      if (cookieHeader) {
        reqHeaders.set("Cookie", cookieHeader)
        log.info("injecting cookies", {
          targetUrl,
          cookieCount: cookieHeader.split(";").length,
        })
      }

      // 透传 headers
      const passthrough = headers()
      if (passthrough) {
        for (const [key, value] of Object.entries(passthrough)) {
          reqHeaders.set(key, value)
        }
      }

      const fetchFn = baseFetch ?? fetch
      return fetchFn(input, { ...init, headers: reqHeaders })
    }

    if (fetch.preconnect) {
      ;(fn as typeof fetch).preconnect = fetch.preconnect
    }

    return fn as typeof fetch
  }
}
