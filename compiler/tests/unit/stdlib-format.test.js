/**
 * stdlib-format — unit tests for scrml:format
 *
 * Tests each formatting function directly.
 * Functions extracted here match stdlib/format/index.scrml exactly.
 *
 * Note on truncate: " →" (space + U+2192) is 2 characters.
 * truncate(str, 10, " →") leaves 8 chars for content → "Hello wo →"
 *
 * Coverage:
 *   F1-F3   formatCurrency
 *   F4-F7   formatNumber
 *   F8-F12  pluralize
 *   F13-F18 truncate
 *   F19-F24 slug
 *   F25-F28 capitalize / titleCase / toWords
 *   F29-F32 padLeft / padRight
 *   F33-F39 formatBytes
 *   F40-F44 formatPercent
 */

import { describe, test, expect } from "bun:test";

function formatCurrency(amount, currency, locale) {
    return new Intl.NumberFormat(locale || "en-US", {
        style: "currency",
        currency: currency || "USD"
    }).format(amount)
}

function formatNumber(n, decimals, locale) {
    const opts = {}
    if (decimals !== undefined && decimals !== null) {
        opts.minimumFractionDigits = decimals
        opts.maximumFractionDigits = decimals
    }
    return new Intl.NumberFormat(locale || "en-US", opts).format(n)
}

function pluralize(count, singular, plural) {
    const word = count === 1 ? singular : (plural || singular + "s")
    return `${count} ${word}`
}

function truncate(str, maxLength, suffix) {
    if (!str) return str
    const sfx = suffix !== undefined ? suffix : "..."
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength - sfx.length) + sfx
}

function slug(str) {
    if (!str) return ""
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function capitalize(str) {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function titleCase(str) {
    if (!str) return str
    return str.replace(/\b\w/g, c => c.toUpperCase())
}

function toWords(str) {
    if (!str) return str
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .trim()
}

function padLeft(str, length, char) {
    return String(str).padStart(length, char || " ")
}

function padRight(str, length, char) {
    return String(str).padEnd(length, char || " ")
}

function formatBytes(bytes, decimals) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals !== undefined ? decimals : 1
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const value = bytes / Math.pow(k, i)
    const formatted = dm === 0 ? Math.round(value) : parseFloat(value.toFixed(dm))
    return `${formatted} ${sizes[i]}`
}

function formatPercent(value, decimals) {
    const dm = decimals !== undefined ? decimals : 0
    return `${(value * 100).toFixed(dm)}%`
}

describe("scrml:format — formatCurrency", () => {
    test("F1: USD default locale", () => {
        expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56")
    })
    test("F2: EUR with de-DE locale contains € and 1.234", () => {
        const r = formatCurrency(1234.56, "EUR", "de-DE")
        expect(r).toContain("1.234")
        expect(r).toContain("€")
    })
    test("F3: zero amount", () => {
        expect(formatCurrency(0, "USD")).toBe("$0.00")
    })
})

describe("scrml:format — formatNumber", () => {
    test("F4: thousands sep + decimal", () => {
        expect(formatNumber(1234567.89)).toBe("1,234,567.89")
    })
    test("F5: zero decimals rounds", () => {
        expect(formatNumber(1234567.89, 0)).toBe("1,234,568")
    })
    test("F6: explicit decimals", () => {
        expect(formatNumber(0.4567, 2)).toBe("0.46")
    })
    test("F7: whole number with separator", () => {
        expect(formatNumber(1000)).toBe("1,000")
    })
})

describe("scrml:format — pluralize", () => {
    test("F8: singular count=1", () => {
        expect(pluralize(1, "item")).toBe("1 item")
    })
    test("F9: auto plural count=3", () => {
        expect(pluralize(3, "item")).toBe("3 items")
    })
    test("F10: explicit plural form", () => {
        expect(pluralize(3, "child", "children")).toBe("3 children")
    })
    test("F11: zero count", () => {
        expect(pluralize(0, "result")).toBe("0 results")
    })
    test("F12: irregular plural", () => {
        expect(pluralize(2, "person", "people")).toBe("2 people")
    })
})

describe("scrml:format — truncate", () => {
    test("F13: default '...' suffix", () => {
        expect(truncate("Hello world this is long", 10)).toBe("Hello w...")
    })
    test("F14: no truncation when fits", () => {
        expect(truncate("Hello world", 20)).toBe("Hello world")
    })
    test("F15: 2-char suffix ' →' (arrow is 1 char)", () => {
        // " →" = 2 chars, 10-2=8 content chars → "Hello wo →"
        expect(truncate("Hello world this is long", 10, " \u2192")).toBe("Hello wo \u2192")
    })
    test("F16: empty string", () => {
        expect(truncate("", 10)).toBe("")
    })
    test("F17: null passthrough", () => {
        expect(truncate(null, 10)).toBe(null)
    })
    test("F18: exactly maxLength — no truncation", () => {
        expect(truncate("12345", 5)).toBe("12345")
    })
})

describe("scrml:format — slug", () => {
    test("F19: basic word conversion", () => {
        expect(slug("Hello World! This is a Test")).toBe("hello-world-this-is-a-test")
    })
    test("F20: trims hyphens from leading/trailing spaces", () => {
        expect(slug("  Foo  Bar  ")).toBe("foo-bar")
    })
    test("F21: unicode accent stripping", () => {
        expect(slug("H\u00e9llo W\u00f6rld")).toBe("hello-world")
    })
    test("F22: empty string", () => {
        expect(slug("")).toBe("")
    })
    test("F23: numbers preserved", () => {
        expect(slug("100% Genuine")).toBe("100-genuine")
    })
    test("F24: consecutive special chars collapse", () => {
        expect(slug("hello---world")).toBe("hello-world")
    })
})

describe("scrml:format — capitalize / titleCase / toWords", () => {
    test("F25: capitalize first letter", () => {
        expect(capitalize("hello world")).toBe("Hello world")
    })
    test("F26: titleCase all words", () => {
        expect(titleCase("the quick brown")).toBe("The Quick Brown")
    })
    test("F27: toWords camelCase", () => {
        expect(toWords("helloWorld")).toBe("hello World")
    })
    test("F28: toWords PascalCase", () => {
        expect(toWords("HelloWorld")).toBe("Hello World")
    })
})

describe("scrml:format — padLeft / padRight", () => {
    test("F29: padLeft with char", () => {
        expect(padLeft("42", 5, "0")).toBe("00042")
    })
    test("F30: padLeft default space", () => {
        expect(padLeft("hi", 5)).toBe("   hi")
    })
    test("F31: padRight with char", () => {
        expect(padRight("hi", 5, "-")).toBe("hi---")
    })
    test("F32: padRight default space", () => {
        expect(padRight("hi", 5)).toBe("hi   ")
    })
})

describe("scrml:format — formatBytes", () => {
    test("F33: zero", () => {
        expect(formatBytes(0)).toBe("0 Bytes")
    })
    test("F34: under 1KB", () => {
        expect(formatBytes(512)).toBe("512 Bytes")
    })
    test("F35: exactly 1KB", () => {
        expect(formatBytes(1024)).toBe("1 KB")
    })
    test("F36: fractional KB", () => {
        expect(formatBytes(1536)).toBe("1.5 KB")
    })
    test("F37: megabytes", () => {
        expect(formatBytes(1048576)).toBe("1 MB")
    })
    test("F38: gigabytes", () => {
        expect(formatBytes(1073741824)).toBe("1 GB")
    })
    test("F39: decimals=0 rounds", () => {
        expect(formatBytes(1536, 0)).toBe("2 KB")
    })
})

describe("scrml:format — formatPercent", () => {
    test("F40: integer percent", () => {
        expect(formatPercent(0.42)).toBe("42%")
    })
    test("F41: decimal percent", () => {
        expect(formatPercent(0.4256, 1)).toBe("42.6%")
    })
    test("F42: 100%", () => {
        expect(formatPercent(1.0)).toBe("100%")
    })
    test("F43: 0%", () => {
        expect(formatPercent(0)).toBe("0%")
    })
    test("F44: 2 decimal places", () => {
        expect(formatPercent(0.1234, 2)).toBe("12.34%")
    })
})
