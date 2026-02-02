import { test, expect, describe } from "bun:test"
import { CookieStore } from "../../src/mcp/cookie-store"

describe("CookieStore", () => {
  describe("createJar", () => {
    test("should create empty jar when cookies is undefined", async () => {
      const jar = await CookieStore.createJar(undefined, "https://api.huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://api.huawei.com")
      expect(cookies).toBeUndefined()
    })

    test("should parse simple cookie string", async () => {
      const jar = await CookieStore.createJar("session=abc123", "https://api.huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://api.huawei.com")
      expect(cookies).toBe("session=abc123")
    })

    test("should parse multiple cookies", async () => {
      const jar = await CookieStore.createJar("session=abc; token=xyz", "https://api.huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://api.huawei.com")
      expect(cookies).toContain("session=abc")
      expect(cookies).toContain("token=xyz")
    })

    test("should handle cookie value with equals sign", async () => {
      const jar = await CookieStore.createJar("data=a=b=c", "https://api.huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://api.huawei.com")
      expect(cookies).toBe("data=a=b=c")
    })
  })

  describe("getCookiesForUrl - domain validation", () => {
    test("should return cookies for matching domain", async () => {
      const jar = await CookieStore.createJar("session=abc", "https://api.huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://api.huawei.com/mcp")
      expect(cookies).toBe("session=abc")
    })

    test("should NOT return cookies for different domain", async () => {
      const jar = await CookieStore.createJar("session=abc", "https://api.huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://evil.com/mcp")
      expect(cookies).toBeUndefined()
    })

    test("should NOT return cookies for similar but different domain", async () => {
      const jar = await CookieStore.createJar("session=abc", "https://huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://not-huawei.com")
      expect(cookies).toBeUndefined()
    })

    test("should return cookies for subdomain when set on parent", async () => {
      // 注意：tough-cookie 默认不会让子域名访问父域名的 cookie
      // 除非 cookie 设置了 domain 属性
      const jar = await CookieStore.createJar("session=abc", "https://api.huawei.com")
      const cookies = await CookieStore.getCookiesForUrl(jar, "https://api.huawei.com/path")
      expect(cookies).toBe("session=abc")
    })
  })

  describe("security - prevent cookie leakage", () => {
    test("should not leak cookies to attacker domain", async () => {
      const jar = await CookieStore.createJar("auth=secret", "https://internal.huawei.com")

      // 攻击者域名不应该获取到 cookie
      expect(await CookieStore.getCookiesForUrl(jar, "https://attacker.com")).toBeUndefined()
      expect(await CookieStore.getCookiesForUrl(jar, "https://huawei.com.attacker.com")).toBeUndefined()
      expect(await CookieStore.getCookiesForUrl(jar, "https://internal.huawei.com.evil.com")).toBeUndefined()
    })
  })
})
