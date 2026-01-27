/**
 * MCP Context - MCP 工具调用的上下文扩展
 *
 * 提供钩子函数，用于在 MCP 工具调用时注入请求上下文（如 cookies）。
 * 这是一个扩展点，允许自定义 MCP 请求的 headers。
 *
 * 设计原则：
 * 1. 钩子模式 - 通过注册钩子来扩展功能，不修改核心代码
 * 2. 可组合 - 支持多个钩子，按顺序执行
 * 3. 类型安全 - 完整的 TypeScript 类型支持
 */

import { RequestContext } from "../request-context"

export type McpRequestHeaders = Record<string, string>

export type McpHeadersHook = () => McpRequestHeaders | undefined | Promise<McpRequestHeaders | undefined>

const hooks: McpHeadersHook[] = []

export namespace McpContext {
  /**
   * 注册一个 headers 钩子
   * 钩子会在每次 MCP 工具调用时执行，返回的 headers 会被合并到请求中
   */
  export function registerHeadersHook(hook: McpHeadersHook): () => void {
    hooks.push(hook)
    return () => {
      const index = hooks.indexOf(hook)
      if (index !== -1) hooks.splice(index, 1)
    }
  }

  /**
   * 获取所有钩子生成的 headers
   * 后注册的钩子会覆盖先注册的同名 header
   */
  export async function getHeaders(): Promise<McpRequestHeaders> {
    const result: McpRequestHeaders = {}
    for (const hook of hooks) {
      const headers = await hook()
      if (headers) Object.assign(result, headers)
    }
    return result
  }

  /**
   * 清除所有钩子（主要用于测试）
   */
  export function clearHooks(): void {
    hooks.length = 0
  }

  /**
   * 创建一个带有动态 headers 的 fetch 函数
   * 用于 MCP transport 的 customFetch 选项
   *
   * @param baseHeaders 基础 headers（来自配置）
   * @returns 包装后的 fetch 函数
   */
  export function createFetch(baseHeaders?: Record<string, string>): typeof fetch {
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const contextHeaders = await getHeaders()
      const headers = new Headers(init?.headers)

      // 添加基础 headers
      if (baseHeaders) {
        for (const [key, value] of Object.entries(baseHeaders)) {
          headers.set(key, value)
        }
      }

      // 添加上下文 headers（如 cookies）
      for (const [key, value] of Object.entries(contextHeaders)) {
        headers.set(key, value)
      }

      return fetch(input, { ...init, headers })
    }
    
    // 添加 preconnect 属性以匹配 fetch 类型（如果存在）
    if (fetch.preconnect) {
      customFetch.preconnect = fetch.preconnect
    }
    
    return customFetch as typeof fetch
  }
}

// 默认钩子：从 RequestContext 获取 cookies
McpContext.registerHeadersHook(() => {
  const cookies = RequestContext.cookies()
  if (cookies) return { Cookie: cookies }
  return undefined
})
