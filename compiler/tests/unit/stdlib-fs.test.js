/**
 * stdlib-fs — unit tests for scrml:fs
 *
 * Tests each file system function directly using Node.js fs APIs.
 * Functions extracted here match stdlib/fs/index.scrml exactly
 * (without server {} wrappers since tests run in Bun directly).
 *
 * Coverage:
 *   FS1-FS3   readFileSync
 *   FS4-FS6   writeFileSync
 *   FS7-FS9   existsSync
 *   FS10-FS12 mkdirSync
 *   FS13-FS15 readdirSync
 *   FS16-FS19 statSync
 *   FS20-FS22 rmSync
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

// --- Functions extracted from stdlib/fs/index.scrml (no server {} wrappers) ---

function readFileSync(filePath, encoding) {
    return fs.readFileSync(filePath, { encoding: encoding || "utf-8" })
}

function writeFileSync(filePath, content, encoding) {
    fs.writeFileSync(filePath, content, { encoding: encoding || "utf-8" })
}

function existsSync(filePath) {
    return fs.existsSync(filePath)
}

function mkdirSync(dir, options) {
    const opts = options || { recursive: true }
    fs.mkdirSync(dir, opts)
}

function readdirSync(dir) {
    return fs.readdirSync(dir)
}

function statSync(filePath) {
    try {
        const s = fs.statSync(filePath)
        return {
            isFile: s.isFile(),
            isDirectory: s.isDirectory(),
            size: s.size,
            mtime: s.mtime
        }
    } catch(e) {
        return undefined
    }
}

function rmSync(filePath, options) {
    const opts = options || { recursive: false, force: false }
    fs.rmSync(filePath, opts)
}

// --- Test setup / teardown ---

let testDir;

beforeAll(() => {
    testDir = path.join(tmpdir(), `scrml-fs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    fs.mkdirSync(testDir, { recursive: true })
})

afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
})

// --- Tests ---

describe("scrml:fs — readFileSync", () => {
    test("FS1: basic read returns file content", () => {
        const p = path.join(testDir, "read-basic.txt")
        fs.writeFileSync(p, "hello world", "utf-8")
        expect(readFileSync(p)).toBe("hello world")
    })

    test("FS2: explicit encoding (utf-8)", () => {
        const p = path.join(testDir, "read-enc.txt")
        fs.writeFileSync(p, "café", "utf-8")
        expect(readFileSync(p, "utf-8")).toBe("café")
    })

    test("FS3: missing file throws", () => {
        const p = path.join(testDir, "does-not-exist.txt")
        expect(() => readFileSync(p)).toThrow()
    })
})

describe("scrml:fs — writeFileSync", () => {
    test("FS4: basic write creates file with content", () => {
        const p = path.join(testDir, "write-basic.txt")
        writeFileSync(p, "test data")
        expect(fs.readFileSync(p, "utf-8")).toBe("test data")
    })

    test("FS5: overwrite replaces content", () => {
        const p = path.join(testDir, "write-overwrite.txt")
        writeFileSync(p, "first")
        writeFileSync(p, "second")
        expect(fs.readFileSync(p, "utf-8")).toBe("second")
    })

    test("FS6: write to nested path (parent must exist)", () => {
        const nested = path.join(testDir, "write-nested")
        fs.mkdirSync(nested, { recursive: true })
        const p = path.join(nested, "deep.txt")
        writeFileSync(p, "deep content")
        expect(fs.readFileSync(p, "utf-8")).toBe("deep content")
    })
})

describe("scrml:fs — existsSync", () => {
    test("FS7: returns true for existing file", () => {
        const p = path.join(testDir, "exists-file.txt")
        fs.writeFileSync(p, "x", "utf-8")
        expect(existsSync(p)).toBe(true)
    })

    test("FS8: returns false for missing path", () => {
        const p = path.join(testDir, "nope-not-here")
        expect(existsSync(p)).toBe(false)
    })

    test("FS9: returns true for existing directory", () => {
        const d = path.join(testDir, "exists-dir")
        fs.mkdirSync(d, { recursive: true })
        expect(existsSync(d)).toBe(true)
    })
})

describe("scrml:fs — mkdirSync", () => {
    test("FS10: basic directory creation", () => {
        const d = path.join(testDir, "mkdir-basic")
        mkdirSync(d)
        expect(fs.existsSync(d)).toBe(true)
        expect(fs.statSync(d).isDirectory()).toBe(true)
    })

    test("FS11: recursive creation (nested path)", () => {
        const d = path.join(testDir, "mkdir-a", "mkdir-b", "mkdir-c")
        mkdirSync(d)
        expect(fs.existsSync(d)).toBe(true)
    })

    test("FS12: already exists does not throw (recursive: true)", () => {
        const d = path.join(testDir, "mkdir-exists")
        fs.mkdirSync(d, { recursive: true })
        expect(() => mkdirSync(d)).not.toThrow()
    })
})

describe("scrml:fs — readdirSync", () => {
    test("FS13: lists files in directory", () => {
        const d = path.join(testDir, "readdir-basic")
        fs.mkdirSync(d, { recursive: true })
        fs.writeFileSync(path.join(d, "a.txt"), "a")
        fs.writeFileSync(path.join(d, "b.txt"), "b")
        const entries = readdirSync(d)
        expect(entries).toContain("a.txt")
        expect(entries).toContain("b.txt")
        expect(entries.length).toBe(2)
    })

    test("FS14: empty directory returns empty array", () => {
        const d = path.join(testDir, "readdir-empty")
        fs.mkdirSync(d, { recursive: true })
        expect(readdirSync(d)).toEqual([])
    })

    test("FS15: missing directory throws", () => {
        const d = path.join(testDir, "readdir-nope")
        expect(() => readdirSync(d)).toThrow()
    })
})

describe("scrml:fs — statSync", () => {
    test("FS16: file stats", () => {
        const p = path.join(testDir, "stat-file.txt")
        fs.writeFileSync(p, "12345", "utf-8")
        const s = statSync(p)
        expect(s).toBeDefined()
        expect(s.isFile).toBe(true)
        expect(s.isDirectory).toBe(false)
        expect(s.size).toBe(5)
        expect(s.mtime).toBeInstanceOf(Date)
    })

    test("FS17: directory stats", () => {
        const d = path.join(testDir, "stat-dir")
        fs.mkdirSync(d, { recursive: true })
        const s = statSync(d)
        expect(s).toBeDefined()
        expect(s.isFile).toBe(false)
        expect(s.isDirectory).toBe(true)
        expect(s.mtime).toBeInstanceOf(Date)
    })

    test("FS18: missing path returns undefined", () => {
        const p = path.join(testDir, "stat-nope")
        expect(statSync(p)).toBeUndefined()
    })

    test("FS19: mtime is recent", () => {
        const p = path.join(testDir, "stat-mtime.txt")
        const before = new Date()
        fs.writeFileSync(p, "data", "utf-8")
        const s = statSync(p)
        expect(s.mtime.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    })
})

describe("scrml:fs — rmSync", () => {
    test("FS20: remove a file", () => {
        const p = path.join(testDir, "rm-file.txt")
        fs.writeFileSync(p, "bye", "utf-8")
        expect(fs.existsSync(p)).toBe(true)
        rmSync(p)
        expect(fs.existsSync(p)).toBe(false)
    })

    test("FS21: recursive remove directory", () => {
        const d = path.join(testDir, "rm-dir")
        fs.mkdirSync(path.join(d, "sub"), { recursive: true })
        fs.writeFileSync(path.join(d, "sub", "file.txt"), "x")
        expect(fs.existsSync(d)).toBe(true)
        rmSync(d, { recursive: true })
        expect(fs.existsSync(d)).toBe(false)
    })

    test("FS22: missing path with force does not throw", () => {
        const p = path.join(testDir, "rm-nope")
        expect(() => rmSync(p, { force: true })).not.toThrow()
    })
})
