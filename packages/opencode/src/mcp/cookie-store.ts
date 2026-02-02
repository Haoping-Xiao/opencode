/**
 * Cookie Store - 基于 tough-cookie 的安全 Cookie 管理
 *
 * 解决安全问题：
 * 1. 域名校验 - 只向匹配域名的 MCP 服务器发送 cookie
 * 2. RFC 6265 标准 - 完整的 cookie 规范实现
 * 3. 防止泄露 - 不会向非授权域名传递 cookie
 *
 * 使用方式：
 * ```ts
 * const jar = await CookieStore.createJar(rawCookies, 'https://api.huawei.com')
 * const cookieHeader = await CookieStore.getCookiesForUrl(jar, 'https://api.huawei.com/mcp')
 * ```
 */

import { CookieJar } from "tough-cookie"

export namespace CookieStore {
  /**
   * 从原始 cookie 字符串创建 CookieJar
   * @param cookies 原始 cookie 字符串（如 "a=1; b=2"）
   * @param sourceUrl 来源 URL，用于设置 cookie 的域名
   */
  export async function createJar(cookies: string | undefined, sourceUrl: string): Promise<CookieJar> {
    const jar = new CookieJar()
    if (!cookies) return jar

    for (const part of cookies.split(";")) {
      const trimmed = part.trim()
      if (!trimmed) continue
      try {
        await jar.setCookie(trimmed, sourceUrl)
      } catch {
        // 忽略无效 cookie
      }
    }

    return jar
  }

  /**
   * 获取指定 URL 的 cookie 字符串
   * tough-cookie 自动处理域名校验（RFC 6265 标准）
   *
   * @param jar CookieJar 实例
   * @param targetUrl 目标 URL
   * @returns cookie 字符串（如 "a=1; b=2"）或 undefined
   */
  export async function getCookiesForUrl(jar: CookieJar, targetUrl: string): Promise<string | undefined> {
    try {
      // tough-cookie 内置域名校验，不匹配的域名会返回空数组
      const cookies = await jar.getCookies(targetUrl)
      if (cookies.length === 0) return undefined
      return cookies.map((c) => `${c.key}=${c.value}`).join("; ")
    } catch {
      return undefined
    }
  }
}
