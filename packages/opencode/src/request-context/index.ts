/**
 * Request Context - 请求级别的上下文管理
 *
 * 用于在请求生命周期内传递上下文信息（如 cookies），
 * 使得 MCP 工具调用时可以获取到原始请求的认证信息。
 *
 * 设计原则：
 * 1. 完全解耦 - 不修改任何开源核心代码
 * 2. 可选使用 - 如果没有设置上下文，不影响原有功能
 * 3. 单一职责 - 只负责请求上下文的存储和获取
 */

import { Context } from "../util/context"

export interface RequestContextData {
  /** 原始请求的 cookies */
  cookies?: string
  /** 可扩展的其他请求元数据 */
  metadata?: Record<string, unknown>
}

const requestContext = Context.create<RequestContextData>("request")

export namespace RequestContext {
  /**
   * 在请求处理函数中提供上下文
   * @example
   * ```ts
   * RequestContext.provide({ cookies: req.headers.cookie }, async () => {
   *   // 在这个作用域内，MCP 工具调用可以获取到 cookies
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
   * 获取当前请求的 cookies
   */
  export function cookies(): string | undefined {
    return get()?.cookies
  }

  /**
   * 获取当前请求的元数据
   */
  export function metadata(): Record<string, unknown> | undefined {
    return get()?.metadata
  }
}
