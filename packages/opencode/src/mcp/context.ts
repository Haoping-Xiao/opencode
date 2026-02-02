/**
 * MCP Context - MCP 工具调用的上下文扩展
 *
 * 提供 fetch 包装，用于 MCP transport 的 customFetch 选项。
 * Cookie 注入逻辑委托给 RequestContext。
 */

import { RequestContext } from "../request-context"

export namespace McpContext {
  /**
   * 创建一个带有动态 headers 的 fetch 函数
   * 用于 MCP transport 的 customFetch 选项
   *
   * @param baseHeaders 基础 headers（来自配置）
   * @returns 包装后的 fetch 函数
   */
  export function createFetch(baseHeaders?: Record<string, string>): typeof fetch {
    const baseFetch = RequestContext.createFetch()

    const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      if (baseHeaders) {
        for (const [key, value] of Object.entries(baseHeaders)) {
          headers.set(key, value)
        }
      }
      return baseFetch(input, { ...init, headers })
    }

    if (fetch.preconnect) {
      ;(customFetch as typeof fetch).preconnect = fetch.preconnect
    }

    return customFetch as typeof fetch
  }
}
