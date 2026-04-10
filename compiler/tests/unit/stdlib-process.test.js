/**
 * stdlib-process — unit tests for scrml:process
 *
 * Tests each process/environment function directly.
 * Functions extracted here match stdlib/process/index.scrml exactly,
 * using Node/Bun process APIs.
 *
 * Coverage:
 *   PR1-PR2   cwd (returns string, matches process.cwd())
 *   PR3-PR5   env (existing var, missing var, empty string key)
 *   PR6-PR7   argv (returns array, contains runtime path)
 *   PR8-PR9   platform (returns string, matches process.platform)
 *   PR10-PR11 uptime (returns number > 0)
 *   PR12-PR14 memoryUsage (returns object, expected keys, values are numbers)
 */

import { describe, test, expect } from "bun:test";

function cwd() {
    return process.cwd()
}

function env(key) {
    if (key === undefined || key === null) return undefined
    const val = process.env[String(key)]
    return val !== undefined ? val : undefined
}

function argv() {
    return Array.from(process.argv)
}

function platform() {
    return process.platform
}

function uptime() {
    return process.uptime()
}

function memoryUsage() {
    const mem = process.memoryUsage()
    return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss
    }
}

describe("scrml:process — cwd", () => {
    test("PR1: returns a string", () => {
        const result = cwd()
        expect(typeof result).toBe("string")
    })
    test("PR2: matches process.cwd()", () => {
        expect(cwd()).toBe(process.cwd())
    })
})

describe("scrml:process — env", () => {
    test("PR3: existing var (PATH)", () => {
        const result = env("PATH")
        expect(typeof result).toBe("string")
        expect(result.length).toBeGreaterThan(0)
    })
    test("PR4: missing var returns undefined", () => {
        expect(env("SCRML_NONEXISTENT_VAR_12345")).toBeUndefined()
    })
    test("PR5: null key returns undefined", () => {
        expect(env(null)).toBeUndefined()
    })
})

describe("scrml:process — argv", () => {
    test("PR6: returns an array", () => {
        const result = argv()
        expect(Array.isArray(result)).toBe(true)
    })
    test("PR7: first element contains 'bun'", () => {
        const result = argv()
        expect(result[0]).toContain("bun")
    })
})

describe("scrml:process — platform", () => {
    test("PR8: returns a string", () => {
        expect(typeof platform()).toBe("string")
    })
    test("PR9: matches process.platform", () => {
        expect(platform()).toBe(process.platform)
    })
})

describe("scrml:process — uptime", () => {
    test("PR10: returns a number", () => {
        expect(typeof uptime()).toBe("number")
    })
    test("PR11: value is greater than 0", () => {
        expect(uptime()).toBeGreaterThan(0)
    })
})

describe("scrml:process — memoryUsage", () => {
    test("PR12: returns an object with expected keys", () => {
        const result = memoryUsage()
        expect(result).toHaveProperty("heapUsed")
        expect(result).toHaveProperty("heapTotal")
        expect(result).toHaveProperty("rss")
    })
    test("PR13: heapUsed and heapTotal are numbers", () => {
        const result = memoryUsage()
        expect(typeof result.heapUsed).toBe("number")
        expect(typeof result.heapTotal).toBe("number")
    })
    test("PR14: rss is a positive number", () => {
        const result = memoryUsage()
        expect(typeof result.rss).toBe("number")
        expect(result.rss).toBeGreaterThan(0)
    })
})
