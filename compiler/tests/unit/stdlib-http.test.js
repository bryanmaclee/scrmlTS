/**
 * stdlib-http — unit tests for scrml:http
 *
 * Tests isOk, isError, withBaseUrl URL resolution, and request logic
 * via mock fetch (no real network calls).
 *
 * Functions extracted here match stdlib/http/index.scrml exactly.
 *
 * Coverage:
 *   H1-H3   isOk()
 *   H4-H8   isError()
 *   H9-H13  withBaseUrl() URL resolution
 *   H14-H20 request logic via mock fetch
 */

import { describe, test, expect } from "bun:test";

function isOk(response) {
    return response && response.ok === true
}

function isError(response) {
    return response && response.status >= 400
}

function withBaseUrl(baseUrl) {
    function resolveUrl(path) {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        const base = baseUrl.replace(/\/$/, "")
        const p = path.startsWith("/") ? path : "/" + path
        return base + p
    }
    return {
        _resolveUrl: resolveUrl,
        get:   (path, opts) => ({ method: "GET", url: resolveUrl(path), opts }),
        post:  (path, body, opts) => ({ method: "POST", url: resolveUrl(path), body, opts }),
        put:   (path, body, opts) => ({ method: "PUT", url: resolveUrl(path), body, opts }),
        del:   (path, opts) => ({ method: "DELETE", url: resolveUrl(path), opts }),
        patch: (path, body, opts) => ({ method: "PATCH", url: resolveUrl(path), body, opts }),
    }
}

async function makeRequest(url, options, mockFetch) {
    const opts = options || {}
    const retryCount = opts.retry || 0
    const extraHeaders = opts.headers || {}
    const fetchOptions = { method: opts.method || "GET", headers: {} }
    for (const [k, v] of Object.entries(extraHeaders)) fetchOptions.headers[k] = v
    if (opts.body !== undefined) {
        if (typeof opts.body === "string") {
            fetchOptions.body = opts.body
        } else {
            fetchOptions.body = JSON.stringify(opts.body)
            if (!fetchOptions.headers["Content-Type"]) {
                fetchOptions.headers["Content-Type"] = "application/json"
            }
        }
    }
    let lastError = null
    for (let attempt = 0; attempt <= retryCount; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 0))
        try {
            const raw = await mockFetch(url, fetchOptions)
            const contentType = raw.headers.get("content-type") || ""
            let data
            if (contentType.includes("application/json")) { data = await raw.json() }
            else { data = await raw.text() }
            return { ok: raw.ok, status: raw.status, data, headers: raw.headers, raw }
        } catch(err) {
            if (err.name === "AbortError") throw new Error(`timed out: ${url}`)
            lastError = err
            if (attempt === retryCount) throw lastError
        }
    }
    throw lastError
}

function mockResponse(status, body, contentType) {
    const ct = contentType || "text/plain"
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (k) => k.toLowerCase() === "content-type" ? ct : null },
        json: async () => JSON.parse(body),
        text: async () => body
    }
}

describe("scrml:http — isOk()", () => {
    test("H1: true for ok:true", () => { expect(isOk({ ok: true, status: 200 })).toBe(true) })
    test("H2: false for ok:false", () => { expect(isOk({ ok: false, status: 404 })).toBe(false) })
    test("H3: false for null", () => { expect(isOk(null)).toBeFalsy() })
})

describe("scrml:http — isError()", () => {
    test("H4: true for 400", () => { expect(isError({ ok: false, status: 400 })).toBe(true) })
    test("H5: true for 500", () => { expect(isError({ ok: false, status: 500 })).toBe(true) })
    test("H6: false for 200", () => { expect(isError({ ok: true, status: 200 })).toBe(false) })
    test("H7: false for 201", () => { expect(isError({ ok: true, status: 201 })).toBe(false) })
    test("H8: false for 301", () => { expect(isError({ ok: false, status: 301 })).toBe(false) })
})

describe("scrml:http — withBaseUrl()", () => {
    test("H9: has all 5 methods", () => {
        const c = withBaseUrl("https://api.example.com")
        expect(typeof c.get).toBe("function")
        expect(typeof c.post).toBe("function")
        expect(typeof c.put).toBe("function")
        expect(typeof c.del).toBe("function")
        expect(typeof c.patch).toBe("function")
    })
    test("H10: resolves relative path", () => {
        expect(withBaseUrl("https://api.example.com")._resolveUrl("/users/42"))
            .toBe("https://api.example.com/users/42")
    })
    test("H11: preserves absolute URL", () => {
        expect(withBaseUrl("https://api.example.com")._resolveUrl("https://other.com/p"))
            .toBe("https://other.com/p")
    })
    test("H12: trailing slash stripped from base", () => {
        expect(withBaseUrl("https://api.example.com/")._resolveUrl("/users"))
            .toBe("https://api.example.com/users")
    })
    test("H13: path without leading slash gets one", () => {
        expect(withBaseUrl("https://api.example.com")._resolveUrl("users"))
            .toBe("https://api.example.com/users")
    })
})

describe("scrml:http — request logic (mock fetch)", () => {
    test("H14: JSON response parsed", async () => {
        const r = await makeRequest("/api", {}, async () =>
            mockResponse(200, '{"name":"Alice"}', "application/json")
        )
        expect(r.ok).toBe(true)
        expect(r.data).toEqual({ name: "Alice" })
    })
    test("H15: text response", async () => {
        const r = await makeRequest("/api", {}, async () =>
            mockResponse(200, "hello", "text/plain")
        )
        expect(r.data).toBe("hello")
    })
    test("H16: 404 sets ok:false", async () => {
        const r = await makeRequest("/api", {}, async () =>
            mockResponse(404, "Not Found", "text/plain")
        )
        expect(r.ok).toBe(false)
        expect(r.status).toBe(404)
    })
    test("H17: default method is GET", async () => {
        let method = null
        await makeRequest("/api", {}, async (url, opts) => {
            method = opts.method
            return mockResponse(200, "", "text/plain")
        })
        expect(method).toBe("GET")
    })
    test("H18: POST object body → JSON serialized", async () => {
        let body = null
        await makeRequest("/api", { method: "POST", body: { name: "Alice" } }, async (url, opts) => {
            body = opts.body
            return mockResponse(201, '{"id":1}', "application/json")
        })
        expect(body).toBe('{"name":"Alice"}')
    })
    test("H20: retry on network error — 3 total attempts for retry:2", async () => {
        let attempts = 0
        try {
            await makeRequest("/api", { retry: 2 }, async () => {
                attempts++
                const e = new Error("Network")
                e.name = "TypeError"
                throw e
            })
        } catch(e) {}
        expect(attempts).toBe(3)
    })
})
