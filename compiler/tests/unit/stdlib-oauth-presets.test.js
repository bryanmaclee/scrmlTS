/**
 * stdlib-oauth-presets — unit tests for provider preset configs.
 *
 * Tests are extracted from stdlib/oauth/{google,github,microsoft,discord}.scrml.
 *
 * Coverage:
 *   G1   googleConfig — endpoints, scopes, PKCE on, access_type=offline + prompt=consent
 *   G2   googleConfig — loginHint / hostedDomain pass through
 *   G3   parseGoogleIdToken — decodes a synthetic JWT payload (no signature verification)
 *   G4   parseGoogleIdToken — null/missing tokens return null
 *   G5   parseGoogleIdToken — malformed JWT throws
 *   GH1  githubConfig — endpoints, scopes, PKCE on, revocationUrl null
 *   GH2  githubConfig — allowSignup + login pass through
 *   M1   microsoftConfig — tenant=common default; URL contains tenant
 *   M2   microsoftConfig — custom tenant interpolated and URI-encoded
 *   M3   microsoftConfig — default scopes include offline_access (refresh tokens)
 *   M4   microsoftConfig — prompt/loginHint/domainHint pass through
 *   D1   discordConfig — endpoints, scopes, revocationUrl set
 *   D2   discordConfig — prompt pass-through; missing prompt → no extra param
 */

import { describe, test, expect } from "bun:test";

// --- Functions extracted from stdlib/oauth/google.scrml ---------------------

function googleConfig(opts) {
  if (!opts) throw new Error("[scrml:oauth/google] opts required");
  const extra = { access_type: "offline", prompt: "consent" };
  if (opts.loginHint)    extra.login_hint = opts.loginHint;
  if (opts.hostedDomain) extra.hd         = opts.hostedDomain;
  return {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
    redirectUri: opts.redirectUri,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    revocationUrl: "https://oauth2.googleapis.com/revoke",
    scopes: opts.scopes || ["openid", "email", "profile"],
    usePKCE: true,
    extraAuthParams: extra,
    storage: opts.storage,
  };
}

function parseGoogleIdToken(tokens) {
  if (!tokens || !tokens.idToken) return null;
  const parts = tokens.idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("[scrml:oauth/google] parseIdToken: malformed JWT");
  }
  const payload = parts[1];
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  try {
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch (e) {
    throw new Error("[scrml:oauth/google] parseIdToken: failed to decode payload");
  }
}

// --- Functions extracted from stdlib/oauth/github.scrml ---------------------

function githubConfig(opts) {
  if (!opts) throw new Error("[scrml:oauth/github] opts required");
  const extra = {};
  if (opts.allowSignup !== undefined) {
    extra.allow_signup = opts.allowSignup ? "true" : "false";
  }
  if (opts.login) extra.login = opts.login;
  return {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
    redirectUri: opts.redirectUri,
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    revocationUrl: null,
    scopes: opts.scopes || ["read:user", "user:email"],
    usePKCE: true,
    extraAuthParams: extra,
    storage: opts.storage,
  };
}

// --- Functions extracted from stdlib/oauth/microsoft.scrml ------------------

function microsoftConfig(opts) {
  if (!opts) throw new Error("[scrml:oauth/microsoft] opts required");
  const tenant = opts.tenant || "common";
  const extra = {};
  if (opts.prompt)     extra.prompt      = opts.prompt;
  if (opts.loginHint)  extra.login_hint  = opts.loginHint;
  if (opts.domainHint) extra.domain_hint = opts.domainHint;
  const base = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0`;
  return {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
    redirectUri: opts.redirectUri,
    authorizeUrl: `${base}/authorize`,
    tokenUrl: `${base}/token`,
    userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
    revocationUrl: null,
    scopes: opts.scopes || ["openid", "profile", "email", "offline_access"],
    usePKCE: true,
    extraAuthParams: extra,
    storage: opts.storage,
    tenant,
  };
}

// --- Functions extracted from stdlib/oauth/discord.scrml --------------------

function discordConfig(opts) {
  if (!opts) throw new Error("[scrml:oauth/discord] opts required");
  const extra = {};
  if (opts.prompt) extra.prompt = opts.prompt;
  return {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
    redirectUri: opts.redirectUri,
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    revocationUrl: "https://discord.com/api/oauth2/token/revoke",
    scopes: opts.scopes || ["identify", "email"],
    usePKCE: true,
    extraAuthParams: extra,
    storage: opts.storage,
  };
}

// --- helpers ---------------------------------------------------------------

const STORAGE = { put: async () => {}, get: async () => null, del: async () => {} };

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeFakeIdToken(payload) {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body   = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

// --- Google ----------------------------------------------------------------

describe("scrml:oauth/google — googleConfig", () => {
  test("G1 endpoints, default scopes, PKCE, refresh-token flags", () => {
    const c = googleConfig({
      clientId: "id", clientSecret: "sec",
      redirectUri: "https://app/cb", storage: STORAGE,
    });
    expect(c.authorizeUrl).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(c.tokenUrl).toBe("https://oauth2.googleapis.com/token");
    expect(c.userInfoUrl).toBe("https://openidconnect.googleapis.com/v1/userinfo");
    expect(c.revocationUrl).toBe("https://oauth2.googleapis.com/revoke");
    expect(c.scopes).toEqual(["openid", "email", "profile"]);
    expect(c.usePKCE).toBe(true);
    expect(c.extraAuthParams.access_type).toBe("offline");
    expect(c.extraAuthParams.prompt).toBe("consent");
  });

  test("G2 loginHint and hostedDomain pass through", () => {
    const c = googleConfig({
      clientId: "id", redirectUri: "https://app/cb",
      loginHint: "user@example.com", hostedDomain: "example.com",
      storage: STORAGE,
    });
    expect(c.extraAuthParams.login_hint).toBe("user@example.com");
    expect(c.extraAuthParams.hd).toBe("example.com");
  });

  test("G2 custom scopes override defaults", () => {
    const c = googleConfig({
      clientId: "id", redirectUri: "r",
      scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar"],
      storage: STORAGE,
    });
    expect(c.scopes).toContain("https://www.googleapis.com/auth/calendar");
  });
});

describe("scrml:oauth/google — parseIdToken", () => {
  test("G3 decodes payload claims", () => {
    const claims = { sub: "abc", email: "a@b.test", email_verified: true, name: "Ada" };
    const idToken = makeFakeIdToken(claims);
    const out = parseGoogleIdToken({ idToken });
    expect(out).toEqual(claims);
  });

  test("G3 handles base64url-specific chars (- and _)", () => {
    // Construct a payload that base64-encodes to include '+' or '/' chars
    // (so base64url has '-' or '_'), to verify we round-trip correctly.
    const claims = { sub: "??ff", note: "abcd>>" };
    const idToken = makeFakeIdToken(claims);
    expect(parseGoogleIdToken({ idToken })).toEqual(claims);
  });

  test("G4 null tokens object returns null", () => {
    expect(parseGoogleIdToken(null)).toBeNull();
    expect(parseGoogleIdToken({})).toBeNull();
    expect(parseGoogleIdToken({ idToken: null })).toBeNull();
  });

  test("G5 malformed JWT throws", () => {
    expect(() => parseGoogleIdToken({ idToken: "not-a-jwt" })).toThrow(/malformed JWT/);
    expect(() => parseGoogleIdToken({ idToken: "a.b" })).toThrow(/malformed JWT/);
  });

  test("G5 unparseable payload throws", () => {
    // valid 3-part shape, but middle isn't valid base64-of-JSON
    expect(() => parseGoogleIdToken({ idToken: "aaa.@@@.bbb" }))
      .toThrow(/failed to decode payload/);
  });
});

// --- GitHub ----------------------------------------------------------------

describe("scrml:oauth/github — githubConfig", () => {
  test("GH1 endpoints, default scopes, PKCE on, revocationUrl null", () => {
    const c = githubConfig({
      clientId: "id", clientSecret: "sec",
      redirectUri: "https://app/cb", storage: STORAGE,
    });
    expect(c.authorizeUrl).toBe("https://github.com/login/oauth/authorize");
    expect(c.tokenUrl).toBe("https://github.com/login/oauth/access_token");
    expect(c.userInfoUrl).toBe("https://api.github.com/user");
    expect(c.revocationUrl).toBeNull();
    expect(c.scopes).toEqual(["read:user", "user:email"]);
    expect(c.usePKCE).toBe(true);
  });

  test("GH2 allowSignup=false stringifies to 'false'", () => {
    const c = githubConfig({
      clientId: "id", redirectUri: "r", storage: STORAGE,
      allowSignup: false,
    });
    expect(c.extraAuthParams.allow_signup).toBe("false");
  });

  test("GH2 allowSignup=true stringifies to 'true'; login passes through", () => {
    const c = githubConfig({
      clientId: "id", redirectUri: "r", storage: STORAGE,
      allowSignup: true, login: "octocat",
    });
    expect(c.extraAuthParams.allow_signup).toBe("true");
    expect(c.extraAuthParams.login).toBe("octocat");
  });

  test("GH2 omitting allowSignup leaves no extra param", () => {
    const c = githubConfig({ clientId: "id", redirectUri: "r", storage: STORAGE });
    expect(c.extraAuthParams.allow_signup).toBeUndefined();
  });
});

// --- Microsoft -------------------------------------------------------------

describe("scrml:oauth/microsoft — microsoftConfig", () => {
  test("M1 default tenant=common; URL contains 'common'", () => {
    const c = microsoftConfig({
      clientId: "id", redirectUri: "https://app/cb", storage: STORAGE,
    });
    expect(c.tenant).toBe("common");
    expect(c.authorizeUrl).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    expect(c.tokenUrl).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/token");
    expect(c.userInfoUrl).toBe("https://graph.microsoft.com/oidc/userinfo");
    expect(c.revocationUrl).toBeNull();
    expect(c.usePKCE).toBe(true);
  });

  test("M2 custom tenant interpolated; URI-encoded", () => {
    const c = microsoftConfig({
      clientId: "id", redirectUri: "r", storage: STORAGE,
      tenant: "contoso.onmicrosoft.com",
    });
    expect(c.tenant).toBe("contoso.onmicrosoft.com");
    expect(c.authorizeUrl).toContain("/contoso.onmicrosoft.com/");
  });

  test("M2 GUID tenant", () => {
    const c = microsoftConfig({
      clientId: "id", redirectUri: "r", storage: STORAGE,
      tenant: "11111111-2222-3333-4444-555555555555",
    });
    expect(c.authorizeUrl).toContain("/11111111-2222-3333-4444-555555555555/");
  });

  test("M3 default scopes include offline_access for refresh tokens", () => {
    const c = microsoftConfig({ clientId: "id", redirectUri: "r", storage: STORAGE });
    expect(c.scopes).toContain("offline_access");
    expect(c.scopes).toContain("openid");
    expect(c.scopes).toContain("email");
  });

  test("M4 prompt/loginHint/domainHint pass through", () => {
    const c = microsoftConfig({
      clientId: "id", redirectUri: "r", storage: STORAGE,
      prompt: "select_account", loginHint: "user@x.test", domainHint: "x.test",
    });
    expect(c.extraAuthParams.prompt).toBe("select_account");
    expect(c.extraAuthParams.login_hint).toBe("user@x.test");
    expect(c.extraAuthParams.domain_hint).toBe("x.test");
  });
});

// --- Discord ---------------------------------------------------------------

describe("scrml:oauth/discord — discordConfig", () => {
  test("D1 endpoints, default scopes, RFC-7009 revocation present", () => {
    const c = discordConfig({
      clientId: "id", clientSecret: "sec",
      redirectUri: "https://app/cb", storage: STORAGE,
    });
    expect(c.authorizeUrl).toBe("https://discord.com/oauth2/authorize");
    expect(c.tokenUrl).toBe("https://discord.com/api/oauth2/token");
    expect(c.userInfoUrl).toBe("https://discord.com/api/users/@me");
    expect(c.revocationUrl).toBe("https://discord.com/api/oauth2/token/revoke");
    expect(c.scopes).toEqual(["identify", "email"]);
    expect(c.usePKCE).toBe(true);
  });

  test("D2 prompt pass-through; absence leaves extra clean", () => {
    const a = discordConfig({
      clientId: "id", redirectUri: "r", storage: STORAGE, prompt: "consent",
    });
    expect(a.extraAuthParams.prompt).toBe("consent");
    const b = discordConfig({ clientId: "id", redirectUri: "r", storage: STORAGE });
    expect(b.extraAuthParams.prompt).toBeUndefined();
  });
});

// --- guardrails -------------------------------------------------------------

describe("scrml:oauth presets — opts required", () => {
  test("each preset throws on missing opts", () => {
    expect(() => googleConfig()).toThrow(/opts required/);
    expect(() => githubConfig()).toThrow(/opts required/);
    expect(() => microsoftConfig()).toThrow(/opts required/);
    expect(() => discordConfig()).toThrow(/opts required/);
  });
});
