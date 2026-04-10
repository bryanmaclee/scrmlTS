/**
 * stdlib-router — unit tests for scrml:router
 *
 * Tests the pure functions: match(), parseQuery(), buildUrl().
 * navigate/currentPath/onNavigate are browser-only and not tested here.
 *
 * Functions extracted here match stdlib/router/index.scrml exactly.
 *
 * Coverage:
 *   R1-R10  match()
 *   R11-R17 parseQuery()
 *   R18-R25 buildUrl()
 */

import { describe, test, expect } from "bun:test";

function parseQuery(queryString) {
    if (!queryString) return {}
    const qs = queryString.startsWith("?") ? queryString.slice(1) : queryString
    if (!qs) return {}
    const result = {}
    for (const pair of qs.split("&")) {
        const eqIdx = pair.indexOf("=")
        if (eqIdx === -1) {
            result[decodeURIComponent(pair)] = ""
        } else {
            const key = decodeURIComponent(pair.slice(0, eqIdx))
            const val = decodeURIComponent(pair.slice(eqIdx + 1).replace(/\+/g, " "))
            result[key] = val
        }
    }
    return result
}

function match(pattern, path) {
    if (!path) return null
    const qIdx = path.indexOf("?")
    const rawPath = qIdx >= 0 ? path.slice(0, qIdx) : path
    const rawQuery = qIdx >= 0 ? path.slice(qIdx + 1) : ""
    const query = rawQuery ? parseQuery(rawQuery) : {}
    const normalized = pattern.startsWith("/") ? pattern.slice(1) : pattern
    const segments = normalized.split("/")
    const keys = []
    let regexStr = "^/"
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        if (i > 0) regexStr += "/"
        if (seg === "*") {
            keys.push("*")
            regexStr += "(.*)"
        } else if (seg.startsWith(":")) {
            const optional = seg.endsWith("?")
            const name = optional ? seg.slice(1, -1) : seg.slice(1)
            keys.push(name)
            if (optional) {
                regexStr = regexStr.slice(0, -1)
                regexStr += "(?:/([^/]+))?"
            } else {
                regexStr += "([^/]+)"
            }
        } else {
            regexStr += seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        }
    }
    regexStr += "/?$"
    const regex = new RegExp(regexStr)
    const m = rawPath.match(regex)
    if (!m) return null
    const params = {}
    keys.forEach((key, idx) => {
        if (m[idx + 1] !== undefined) params[key] = m[idx + 1]
    })
    return { params, query }
}

function buildUrl(pattern, params, query) {
    let url = pattern
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}?`, encodeURIComponent(String(value)))
            url = url.replace(`:${key}`, encodeURIComponent(String(value)))
        }
    }
    url = url.replace(/\/:[a-zA-Z][a-zA-Z0-9]*\?/g, "")
    if (query && Object.keys(query).length > 0) {
        const qs = Object.entries(query)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&")
        if (qs) url += "?" + qs
    }
    return url
}

describe("scrml:router — match()", () => {
    test("R1: single named param", () => {
        const r = match("/users/:id", "/users/42")
        expect(r).not.toBeNull()
        expect(r.params.id).toBe("42")
    })
    test("R2: multiple named params", () => {
        const r = match("/blog/:year/:month", "/blog/2026/04")
        expect(r.params.year).toBe("2026")
        expect(r.params.month).toBe("04")
    })
    test("R3: no match returns null", () => {
        expect(match("/users/:id", "/posts/1")).toBeNull()
    })
    test("R4: literal path match", () => {
        const r = match("/dashboard", "/dashboard")
        expect(r).not.toBeNull()
        expect(Object.keys(r.params)).toHaveLength(0)
    })
    test("R5: wildcard captures everything", () => {
        const r = match("/files/*", "/files/a/b/c")
        expect(r).not.toBeNull()
        expect(r.params["*"]).toBe("a/b/c")
    })
    test("R6: optional param present", () => {
        const r = match("/admin/:id?", "/admin/5")
        expect(r.params.id).toBe("5")
    })
    test("R7: optional param absent", () => {
        const r = match("/admin/:id?", "/admin")
        expect(r).not.toBeNull()
        expect(r.params.id).toBeUndefined()
    })
    test("R8: query string stripped from path matching", () => {
        const r = match("/users/:id", "/users/99?tab=settings")
        expect(r.params.id).toBe("99")
    })
    test("R9: query string in result.query", () => {
        const r = match("/users/:id", "/users/99?tab=settings&view=list")
        expect(r.query.tab).toBe("settings")
        expect(r.query.view).toBe("list")
    })
    test("R10: deep path structure", () => {
        const r = match("/api/v1/users/:id/posts", "/api/v1/users/42/posts")
        expect(r).not.toBeNull()
        expect(r.params.id).toBe("42")
    })
})

describe("scrml:router — parseQuery()", () => {
    test("R11: basic with leading ?", () => {
        const q = parseQuery("?foo=bar")
        expect(q.foo).toBe("bar")
    })
    test("R12: multiple pairs", () => {
        const q = parseQuery("?a=1&b=2&c=3")
        expect(q.a).toBe("1")
        expect(q.c).toBe("3")
    })
    test("R13: empty string → {}", () => {
        expect(parseQuery("")).toEqual({})
    })
    test("R14: null → {}", () => {
        expect(parseQuery(null)).toEqual({})
    })
    test("R15: no leading ? accepted", () => {
        expect(parseQuery("x=hello").x).toBe("hello")
    })
    test("R16: URL encoded values decoded", () => {
        const q = parseQuery("?msg=hello%20world")
        expect(q.msg).toBe("hello world")
    })
    test("R17: plus as space", () => {
        expect(parseQuery("?q=hello+world").q).toBe("hello world")
    })
})

describe("scrml:router — buildUrl()", () => {
    test("R18: single param", () => {
        expect(buildUrl("/users/:id", { id: 42 })).toBe("/users/42")
    })
    test("R19: multiple params", () => {
        expect(buildUrl("/blog/:year/:month", { year: 2026, month: "04" })).toBe("/blog/2026/04")
    })
    test("R20: with query params", () => {
        expect(buildUrl("/users/:id", { id: 42 }, { tab: "profile" })).toBe("/users/42?tab=profile")
    })
    test("R21: optional param provided", () => {
        expect(buildUrl("/admin/:id?", { id: 5 })).toBe("/admin/5")
    })
    test("R22: optional param absent strips segment", () => {
        expect(buildUrl("/admin/:id?", {})).toBe("/admin")
    })
    test("R23: numeric params coerced to string", () => {
        expect(buildUrl("/item/:id", { id: 42 })).toBe("/item/42")
    })
    test("R24: empty query → no ?", () => {
        const url = buildUrl("/users/:id", { id: 1 }, {})
        expect(url).not.toContain("?")
    })
    test("R25: undefined/null query values filtered", () => {
        expect(buildUrl("/search", {}, { q: "test", page: undefined })).toBe("/search?q=test")
    })
})
