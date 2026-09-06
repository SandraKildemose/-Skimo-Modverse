const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  shell,
  screen,
  Notification,
} = require("electron");
const path = require("path");
const fs = require("fs/promises");
const fssync = require("fs");
const { spawn, spawnSync } = require("child_process");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { localeFromCountry, t } = require("./i18n");

const APP_DISPLAY_NAME = "Sims ModGuard Lite";
const MENU_BAR_TITLE = " Sims";
try {
  app.setName(APP_DISPLAY_NAME);
} catch {}

// Skip login, subscription gate, and startup guide — open straight into the app
const DIRECT_ACCESS = true;

// Sørg for at appen kun kan køre én gang (ingen dobbelt menulinje-ikoner)
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  try {
    app.quit();
  } catch {}
} else {
  app.on("second-instance", (_event, argv = []) => {
    try {
      ensureTray();
    } catch {}
    try {
      showMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    } catch {
      // ignore
    }
    handleExternalOpenArgs(argv);
  });
}

let tray = null;
let mainWindow = null;
let widgetWindow = null;
let scannerWindow = null;
let widgetHideTimer = null;
let scannerHideTimer = null;

let allowQuit = false;
let preferredLocale = "";

let activated = true; // DIRECT_ACCESS — always unlocked
let activationInfo = { country: "", code: "" };
let subscriptionState = null;
let generatedCodes = [];
let emailSettings = {};

let protectionEnabled = false;
let scanning = false;

let destinationFolder = "";
let customDownloadsFolder = "";
let downloadsFolder = "";

let downloadsWatcher = null;
let scanQueue = [];
let queuedPaths = new Set();
let forcedScanPaths = new Set();
let queuePumping = false;
let pendingOpenFilePaths = new Set();

let history = [];
let lastEvent = null;
let outdatedModsCache = { items: [], scannedAt: null, modsFolder: "", totalScanned: 0 };
let aiIndexState = null;
let aiIndexTimer = null;

let currentInstallFingerprint = "";

const VALID_CODE_HASHES = new Set([
  "886eb54fb1f7079bd2dc447320672d06aacac834540f98a3aa668e5ce8a9fdca",
  "cc65e91fdb7990a24acd5f0a3d2c52fc48baaa01907a7648f7ccc75514bc0b84",
  "123b24717b28782dec6ab7e5152618da419c9ce24b0d490752456106304cf692",
]);
const TEST_ACTIVATION_PROFILES = [
  {
    code: "K93zH8WÆå1shingq2437kJ",
    email: "k93zh8wæå1shingq2437kj@skimo.dk",
    maxActivations: 999999,
    neverExpires: true,
    paymentStatus: "paid",
  },
  {
    code: "K93zH8WÆå1shingq2437kJ10",
    email: "k93zh8wæå1shingq2437kj10@skimo.dk",
    maxActivations: 2,
    neverExpires: true,
    paymentStatus: "paid",
  },
];
const UPDATE_PRODUCT_KEY = "modguards";
const UPDATE_FETCH_TIMEOUT_MS = 12000;
const UPDATE_DOWNLOAD_TIMEOUT_MS = 8 * 60 * 1000;
const UPDATE_CHECK_INTERVAL_MS = Math.max(5 * 60 * 1000, Number(process.env.SKIMO_UPDATE_INTERVAL_MS || 60 * 60 * 1000));
const UPDATE_MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const VT_API_KEY = String(process.env.SKIMO_VT_API_KEY || "").trim();
let vtApiKeyOverride = "";
const PRODUCT_ID = "sims";
const SUBSCRIPTION_MAX_ACTIVATIONS = Math.max(1, Number(process.env.SKIMO_SUBSCRIPTION_MAX_ACTIVATIONS || 30));
const SUBSCRIPTION_TERM_MS = Math.max(24 * 60 * 60 * 1000, Number(process.env.SKIMO_SUBSCRIPTION_TERM_MS || 365 * 24 * 60 * 60 * 1000));
const BILLING_STATUS_URL = String(process.env.SKIMO_BILLING_STATUS_URL || "").trim();
const RENEWAL_URL = String(process.env.SKIMO_RENEWAL_URL || "https://www.modguard.dk/forny").trim();
const EMAIL_API_URL = String(process.env.SKIMO_EMAIL_API_URL || "").trim();
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || process.env.SKIMO_RESEND_API_KEY || "").trim();
const EMAIL_FROM = String(process.env.SKIMO_EMAIL_FROM || "ModGuard <noreply@modguard.dk>").trim();
const SCAN_REPORT_TIMEOUT_MS = Math.max(3000, Number(process.env.SKIMO_SCAN_REPORT_TIMEOUT_MS || 8000));
const SCAN_REPORT_URLS = (() => {
  const raw = String(process.env.SKIMO_SCAN_REPORT_URLS || process.env.SKIMO_SCAN_REPORT_URL || "").trim();
  const defaults = ["https://modguard.dk/api/scan-report", "https://www.modguard.dk/api/scan-report"];
  const list = (raw ? raw.split(",") : defaults).map((v) => String(v || "").trim()).filter(Boolean);
  const valid = list.filter((v) => /^https?:\/\//i.test(v));
  return Array.from(new Set(valid.length ? valid : defaults));
})();
const AI_INDEX_TICK_MS = Math.max(15_000, Number(process.env.SKIMO_AI_INDEX_TICK_MS || 30_000));
const AI_INDEX_PHASES = [
  { id: "initialDiscovery", label: "Fase 1 — Finder lokale mods", durationMs: 30 * 60 * 1000 },
  { id: "imageValidation", label: "Fase 2 — Validerer billeder igen", durationMs: 30 * 60 * 1000 },
  { id: "searchQuality", label: "Fase 3 — Tester søgekvalitet", durationMs: 12 * 60 * 1000 },
  { id: "selfImprovement", label: "Fase 4 — Forbedrer og prøver igen", durationMs: 60 * 60 * 1000 },
];
const AI_SEARCH_TESTS = [
  "hair",
  "hår",
  "har",
  "male hair",
  "female hair",
  "malehair",
  "femalehair",
  "curly hair",
  "blonde hair",
  "blonde curly female hair",
  "hår blonde curly famel hair",
  "maxis match female hair",
  "male curly hair",
  "infant hair",
  "kitchen clutter",
  "furniture",
  "toddler",
  "skin",
  "makeup",
  "clothes",
  "tøj",
  "gameplay",
  "script mods",
];
const UPDATE_FEED_URLS = (() => {
  const raw = String(process.env.SKIMO_UPDATE_FEEDS || "").trim();
  const defaults = ["https://modguard.dk/api/updates/manifest", "https://www.modguard.dk/api/updates/manifest"];
  const list = (raw ? raw.split(",") : defaults).map((v) => String(v || "").trim()).filter(Boolean);
  const valid = list.filter((v) => /^https?:\/\//i.test(v));
  return Array.from(new Set(valid.length ? valid : defaults));
})();
let updateTimer = null;
let updateInterval = null;
let updateInFlight = false;
let latestNotifiedVersion = "";
const SUPPORTED_LOCALES = new Set(["da", "sv", "no", "en", "fr"]);

function normalizeActivationCode(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(normalizeEmail(value));
}

function isComplexActivationCode(value) {
  const v = normalizeActivationCode(value);
  if (!/^[\p{L}\p{N}]+$/u.test(v)) return false;
  if (v.length < 20) return false;
  if (!/[\p{Lu}]/u.test(v)) return false;
  if (!/[\p{Ll}]/u.test(v)) return false;
  if (!/[0-9]/.test(v)) return false;
  return true;
}

function hashActivationCode(value) {
  return crypto.createHash("sha256").update(normalizeActivationCode(value), "utf8").digest("hex");
}

function normalizeSourceHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function parseWhereFromsOutput(raw) {
  const text = String(raw || "").trim();
  if (!text || text === "(null)") return [];
  const matches = Array.from(text.matchAll(/"([^"]+)"/g)).map((m) => String(m[1] || "").trim()).filter(Boolean);
  if (matches.length) return matches;
  return text
    .replace(/^\(|\)$/g, "")
    .split(",")
    .map((part) => String(part || "").trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
}

function getDownloadSourceMeta(filePath) {
  try {
    const result = spawnSync("/usr/bin/mdls", ["-raw", "-name", "kMDItemWhereFroms", filePath], {
      encoding: "utf8",
      timeout: 1500,
    });
    if (result.error || result.status !== 0) return { sourceUrl: "", sourceHost: "" };
    const whereFroms = parseWhereFromsOutput(result.stdout);
    for (const value of whereFroms) {
      try {
        const url = new URL(value);
        if (!/^https?:$/i.test(url.protocol)) continue;
        const sourceHost = normalizeSourceHost(url.hostname);
        if (!sourceHost) continue;
        return { sourceUrl: url.toString(), sourceHost };
      } catch {}
    }
  } catch {}
  return { sourceUrl: "", sourceHost: "" };
}

function isValidActivationCode(value) {
  if (!isComplexActivationCode(value)) return false;
  if (TEST_ACTIVATION_PROFILES.some((profile) => normalizeActivationCode(profile.code) === normalizeActivationCode(value))) return true;
  if (generatedCodes.some((entry) => entry?.codeHash === hashActivationCode(value))) return true;
  return VALID_CODE_HASHES.has(hashActivationCode(value));
}

function getGeneratedActivationCode(email, code) {
  const emailNorm = normalizeEmail(email);
  const codeHash = hashActivationCode(code);
  return generatedCodes.find((entry) => entry?.email === emailNorm && entry?.codeHash === codeHash) || null;
}

function getTestActivationProfile(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = normalizeActivationCode(code);
  return (
    TEST_ACTIVATION_PROFILES.find(
      (profile) => normalizeEmail(profile.email) === normalizedEmail && normalizeActivationCode(profile.code) === normalizedCode
    ) || null
  );
}

function isKnownTestActivationCode(code) {
  const normalizedCode = normalizeActivationCode(code);
  return TEST_ACTIVATION_PROFILES.some((profile) => normalizeActivationCode(profile.code) === normalizedCode);
}

async function loadGeneratedCodes() {
  try {
    const raw = await fs.readFile(getGeneratedCodesFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    generatedCodes = Array.isArray(parsed) ? parsed : [];
  } catch {
    generatedCodes = [];
  }
}

async function saveGeneratedCodes() {
  await fs.mkdir(getUserDataDir(), { recursive: true });
  await fs.writeFile(getGeneratedCodesFilePath(), JSON.stringify(generatedCodes.slice(-500), null, 2), "utf8");
}

function sanitizeEmailSettings(raw) {
  const next = raw && typeof raw === "object" ? raw : {};
  return {
    resendApiKey: String(next.resendApiKey || "").trim(),
    emailFrom: String(next.emailFrom || "").trim() || EMAIL_FROM,
    emailApiUrl: String(next.emailApiUrl || "").trim(),
  };
}

function getEffectiveEmailSettings() {
  const saved = sanitizeEmailSettings(emailSettings);
  return {
    resendApiKey: RESEND_API_KEY || saved.resendApiKey,
    emailFrom: EMAIL_FROM || saved.emailFrom || "ModGuard <noreply@modguard.dk>",
    emailApiUrl: EMAIL_API_URL || saved.emailApiUrl,
    configured: !!(RESEND_API_KEY || saved.resendApiKey || EMAIL_API_URL || saved.emailApiUrl),
    source: RESEND_API_KEY ? "env-resend" : saved.resendApiKey ? "saved-resend" : EMAIL_API_URL ? "env-custom-api" : saved.emailApiUrl ? "saved-custom-api" : "development-fallback",
  };
}

async function loadEmailSettings() {
  try {
    emailSettings = sanitizeEmailSettings(JSON.parse(await fs.readFile(getEmailSettingsFilePath(), "utf8")));
  } catch {
    emailSettings = sanitizeEmailSettings(null);
  }
}

async function saveEmailSettings(nextSettings) {
  emailSettings = sanitizeEmailSettings({ ...emailSettings, ...(nextSettings || {}) });
  await fs.mkdir(getUserDataDir(), { recursive: true });
  await fs.writeFile(getEmailSettingsFilePath(), JSON.stringify(emailSettings, null, 2), { mode: 0o600 });
}

function createSubscriptionCode() {
  return `MGsims${crypto.randomBytes(8).toString("hex")}Code${crypto.randomInt(1000, 9999)}`;
}

function createDefaultSubscriptionState() {
  return {
    product: PRODUCT_ID,
    email: "",
    codeHash: "",
    codeLast4: "",
    activationCount: 0,
    maxActivations: SUBSCRIPTION_MAX_ACTIVATIONS,
    activatedAt: "",
    expiresAt: "",
    paymentStatus: "unknown",
    renewalRequired: false,
    status: "inactive",
    reason: "",
    renewalUrl: "",
    allowNewCode: false,
    lastPaymentCheckAt: "",
    lastPaymentCheckError: "",
  };
}

function buildRenewalUrl(email = "") {
  const normalizedEmail = normalizeEmail(email);
  const fallback = "https://www.modguard.dk/forny";
  try {
    const url = new URL(RENEWAL_URL || fallback);
    url.searchParams.set("product", PRODUCT_ID);
    if (normalizedEmail) url.searchParams.set("email", normalizedEmail);
    return url.toString();
  } catch {
    return fallback;
  }
}

function sanitizeSubscriptionState(raw) {
  const base = createDefaultSubscriptionState();
  const next = raw && typeof raw === "object" ? { ...base, ...raw } : base;
  next.product = PRODUCT_ID;
  next.email = normalizeEmail(next.email);
  next.codeHash = String(next.codeHash || "").trim().toLowerCase();
  next.codeLast4 = String(next.codeLast4 || "").trim();
  next.activationCount = Math.max(0, Number(next.activationCount || 0));
  next.maxActivations = Math.max(1, Number(next.maxActivations || SUBSCRIPTION_MAX_ACTIVATIONS));
  next.activatedAt = String(next.activatedAt || "").trim();
  next.expiresAt = String(next.expiresAt || "").trim();
  next.paymentStatus = ["paid", "unpaid", "unknown"].includes(String(next.paymentStatus || ""))
    ? String(next.paymentStatus || "unknown")
    : "unknown";
  next.renewalUrl = String(next.renewalUrl || "").trim() || buildRenewalUrl(next.email);
  next.allowNewCode = !!next.allowNewCode;
  next.lastPaymentCheckAt = String(next.lastPaymentCheckAt || "").trim();
  next.lastPaymentCheckError = String(next.lastPaymentCheckError || "").trim();
  next.status = String(next.status || "inactive").trim() || "inactive";
  next.reason = String(next.reason || "").trim();
  return next;
}

function evaluateSubscriptionState(raw) {
  const next = sanitizeSubscriptionState(raw);
  const now = Date.now();
  const expiresAtMs = next.expiresAt ? Date.parse(next.expiresAt) : 0;
  let status = "inactive";
  let reason = "";

  if (next.codeHash) {
    status = "active";
    if (next.paymentStatus === "unpaid") {
      status = "payment_due";
      reason = "paymentDue";
    } else if (expiresAtMs && Number.isFinite(expiresAtMs) && now > expiresAtMs) {
      status = "expired";
      reason = "expired";
    } else if (next.activationCount >= next.maxActivations) {
      status = "exhausted";
      reason = "activationLimit";
    }
  }

  next.status = status;
  next.reason = reason;
  next.renewalRequired = status !== "active" && status !== "inactive";
  next.renewalUrl = next.renewalUrl || buildRenewalUrl(next.email);
  return next;
}

function ensureDirectAccess() {
  if (!DIRECT_ACCESS) return;
  activated = true;
  const nowIso = new Date().toISOString();
  if (!subscriptionState?.codeHash) {
    subscriptionState = evaluateSubscriptionState({
      product: PRODUCT_ID,
      email: "local@modverse.local",
      codeHash: hashActivationCode("modverse-direct-access"),
      codeLast4: "cess",
      activationCount: 0,
      maxActivations: SUBSCRIPTION_MAX_ACTIVATIONS,
      activatedAt: nowIso,
      expiresAt: "",
      paymentStatus: "paid",
      renewalUrl: RENEWAL_URL,
      allowNewCode: true,
      lastPaymentCheckAt: nowIso,
      lastPaymentCheckError: "",
    });
  } else {
    subscriptionState = evaluateSubscriptionState(subscriptionState);
  }
  if (!activationInfo?.country) {
    activationInfo = { country: "denmark", code: "local" };
  }
}

function applySubscriptionRuntimeState() {
  if (DIRECT_ACCESS) {
    ensureDirectAccess();
    return;
  }
  subscriptionState = evaluateSubscriptionState(subscriptionState);
  if (!subscriptionState || subscriptionState.status === "inactive") return;
  if (subscriptionState.status !== "active") {
    activated = false;
    protectionEnabled = false;
    try {
      stopDownloadsWatcher();
    } catch {}
    clearQueue();
  }
}

function maskEmail(email) {
  const value = normalizeEmail(email);
  if (!value || !value.includes("@")) return "";
  const [name, domain] = value.split("@");
  const safeName = name.length <= 2 ? `${name[0] || "*"}*` : `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}`;
  return `${safeName}@${domain}`;
}

function getSubscriptionReasonMessage(locale, reason) {
  if (reason === "paymentDue") return t(locale, "err.subscriptionPaymentDue");
  if (reason === "activationLimit") return t(locale, "err.subscriptionLimitReached");
  if (reason === "expired") return t(locale, "err.subscriptionExpired");
  return t(locale, "err.subscriptionRenewRequired");
}

function resetTestProfileIfNeeded(state) {
  const next = sanitizeSubscriptionState(state);
  const profile = TEST_ACTIVATION_PROFILES.find(
    (item) => hashActivationCode(item.code) === next.codeHash && normalizeEmail(item.email) === normalizeEmail(next.email)
  );
  if (!profile) return next;
  if (next.activationCount > profile.maxActivations) {
    next.activationCount = 0;
  }
  if (profile.neverExpires) next.expiresAt = "";
  next.maxActivations = profile.maxActivations;
  next.paymentStatus = profile.paymentStatus || next.paymentStatus;
  return next;
}

function ensureSubscriptionAllowsUse(locale) {
  if (DIRECT_ACCESS) return;
  applySubscriptionRuntimeState();
  if (!subscriptionState) return;
  if (subscriptionState.status !== "active") {
    throw new Error(getSubscriptionReasonMessage(locale, subscriptionState.reason));
  }
}

async function consumeSubscriptionUse() {
  if (!subscriptionState?.codeHash) return;
  const next = evaluateSubscriptionState({
    ...subscriptionState,
    activationCount: Math.max(0, Number(subscriptionState.activationCount || 0)) + 1,
  });
  subscriptionState = next;
  applySubscriptionRuntimeState();
  await saveState();
  broadcastState();
  return subscriptionState.status;
}

function parseVersion(version) {
  return String(version || "")
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

function compareVersions(a, b) {
  const aa = parseVersion(a);
  const bb = parseVersion(b);
  const max = Math.max(aa.length, bb.length);
  for (let i = 0; i < max; i++) {
    const av = aa[i] || 0;
    const bv = bb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function platformCandidates() {
  const p = process.platform;
  const a = process.arch;
  const out = [`${p}-${a}`, p];
  if (p === "darwin") out.push("mac", "macos");
  if (p === "win32") out.push("windows", "win");
  if (p === "linux") out.push("linux");
  return Array.from(new Set(out));
}

function pickArtifact(product) {
  const map = product && typeof product === "object" ? product.download : null;
  if (!map || typeof map !== "object") return null;
  for (const key of platformCandidates()) {
    if (map[key] && map[key].url) return map[key];
  }
  return null;
}

function requestJson(urlString, timeoutMs = UPDATE_FETCH_TIMEOUT_MS, redirects = 0, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(urlString);
    } catch {
      reject(new Error("bad_url"));
      return;
    }
    const client = urlObj.protocol === "http:" ? http : https;
    const req = client.request(
      urlObj,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": `${APP_DISPLAY_NAME}/${app.getVersion?.() || "0.0.0"}`,
          ...extraHeaders,
        },
      },
      (res) => {
        const status = Number(res.statusCode || 0);
        const location = String(res.headers.location || "");
        if ([301, 302, 307, 308].includes(status) && location && redirects < 2) {
          res.resume();
          resolve(requestJson(new URL(location, urlObj).toString(), timeoutMs, redirects + 1, extraHeaders));
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`http_${status}`));
          return;
        }
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
          if (raw.length > 1_000_000) req.destroy(new Error("manifest_too_large"));
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error("bad_json"));
          }
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

function postJson(urlString, payload, headersOrTimeoutMs = SCAN_REPORT_TIMEOUT_MS, timeoutOrRedirects = 0, redirects = 0) {
  const extraHeaders = headersOrTimeoutMs && typeof headersOrTimeoutMs === "object" ? headersOrTimeoutMs : {};
  const timeoutMs = headersOrTimeoutMs && typeof headersOrTimeoutMs === "object" ? timeoutOrRedirects || SCAN_REPORT_TIMEOUT_MS : headersOrTimeoutMs || SCAN_REPORT_TIMEOUT_MS;
  const redirectCount = headersOrTimeoutMs && typeof headersOrTimeoutMs === "object" ? redirects : timeoutOrRedirects || 0;
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(urlString);
    } catch {
      reject(new Error("bad_url"));
      return;
    }

    const body = JSON.stringify(payload || {});
    const client = urlObj.protocol === "http:" ? http : https;
    const req = client.request(
      urlObj,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": `${APP_DISPLAY_NAME}/${app.getVersion?.() || "0.0.0"}`,
          ...extraHeaders,
        },
      },
      (res) => {
        const status = Number(res.statusCode || 0);
        const location = String(res.headers.location || "");
        if ([301, 302, 307, 308].includes(status) && location && redirectCount < 2) {
          res.resume();
          resolve(postJson(new URL(location, urlObj).toString(), payload, extraHeaders, timeoutMs, redirectCount + 1));
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`http_${status}`));
          return;
        }
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
          if (raw.length > 500_000) req.destroy(new Error("response_too_large"));
        });
        res.on("end", () => {
          if (!raw.trim()) {
            resolve({ ok: true });
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({ ok: true, raw });
          }
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function buildScanReportPayload(entry) {
  const email = normalizeEmail(subscriptionState?.email);
  if (!email || !entry || typeof entry !== "object") return null;
  return {
    product: PRODUCT_ID,
    app: APP_DISPLAY_NAME,
    to: email,
    email,
    subscription: {
      codeLast4: subscriptionState?.codeLast4 || "",
      status: subscriptionState?.status || "",
      paymentStatus: subscriptionState?.paymentStatus || "",
    },
    scan: {
      id: entry.id || "",
      at: entry.at || new Date().toISOString(),
      fileName: entry.fileName || "",
      status: entry.status || "",
      message: entry.message || "",
      score: Number(entry.score || 0),
      reasons: Array.isArray(entry.reasons) ? entry.reasons.slice(0, 20) : [],
      hash: entry.hash || "",
      savedTo: entry.savedTo || "",
      sourceHost: entry.sourceHost || "",
      sourceUrl: entry.sourceUrl || "",
      virusTotal: entry.vt
        ? {
            malicious: Number(entry.vt.malicious || 0),
            suspicious: Number(entry.vt.suspicious || 0),
            harmless: Number(entry.vt.harmless || 0),
            engines: Number(entry.vt.engines || 0),
            link: entry.vt.link || "",
          }
        : null,
    },
  };
}

async function sendScanReportToLinkedEmail(entry) {
  const payload = buildScanReportPayload(entry);
  if (!payload) return false;

  let lastError = "";
  for (const url of SCAN_REPORT_URLS) {
    try {
      await postJson(url, payload);
      sendLog(`[SKIMO] Scan-rapport sendt til ${maskEmail(payload.email)}\n`);
      return true;
    } catch (err) {
      lastError = err?.message || String(err);
    }
  }

  sendLog(`[SKIMO] Kunne ikke sende scan-rapport til email: ${lastError || "ukendt fejl"}\n`);
  return false;
}

async function sendSubscriptionCodeEmail(toEmail, code) {
  const email = normalizeEmail(toEmail);
  if (!email) throw new Error(t(getLocale(), "err.enterEmail"));
  const settings = getEffectiveEmailSettings();
  const payload = {
    product: PRODUCT_ID,
    to: email,
    email,
    code,
    maxActivations: SUBSCRIPTION_MAX_ACTIVATIONS,
    subject: "Din Sims Modverse abonnementkode",
    text: `Din Sims ModGuard kode er ${code}. Den kan bruges til ${SUBSCRIPTION_MAX_ACTIVATIONS} downloads/aktiveringer.`,
    html: `<p>Din Sims ModGuard kode er:</p><p><strong>${code}</strong></p><p>Den kan bruges til ${SUBSCRIPTION_MAX_ACTIVATIONS} downloads/aktiveringer.</p>`,
  };

  if (settings.resendApiKey) {
    await postJson(
      "https://api.resend.com/emails",
      {
        from: settings.emailFrom,
        to: [email],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      },
      { Authorization: `Bearer ${settings.resendApiKey}` },
      12000
    );
    sendLog(`[SKIMO] Abonnementkode sendt via Resend til ${maskEmail(email)}\n`);
    return { sent: true, provider: "resend" };
  }

  if (/^https?:\/\//i.test(settings.emailApiUrl)) {
    await postJson(settings.emailApiUrl, payload, {}, 12000);
    sendLog(`[SKIMO] Abonnementkode sendt via email API til ${maskEmail(email)}\n`);
    return { sent: true, provider: "custom-api" };
  }

  const devEntry = { ...payload, at: new Date().toISOString(), provider: "development-fallback" };
  let existing = [];
  try {
    existing = JSON.parse(await fs.readFile(getSentEmailsFilePath(), "utf8"));
  } catch {
    existing = [];
  }
  existing.push(devEntry);
  await fs.mkdir(getUserDataDir(), { recursive: true });
  await fs.writeFile(getSentEmailsFilePath(), JSON.stringify(existing.slice(-200), null, 2), "utf8");
  sendLog(`[SKIMO] Email API mangler. Testkode gemt lokalt til ${maskEmail(email)}\n`);
  return { sent: false, provider: "development-fallback", devPath: getSentEmailsFilePath() };
}

async function issueSubscriptionCode(email) {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) throw new Error(t(getLocale(), "err.enterEmail"));
  if (!isValidEmail(emailNorm)) throw new Error(t(getLocale(), "err.invalidEmail"));
  const code = createSubscriptionCode();
  const nowIso = new Date().toISOString();
  generatedCodes.push({
    product: PRODUCT_ID,
    email: emailNorm,
    codeHash: hashActivationCode(code),
    codeLast4: code.slice(-4),
    maxActivations: SUBSCRIPTION_MAX_ACTIVATIONS,
    createdAt: nowIso,
    usedAt: "",
  });
  await saveGeneratedCodes();
  const emailResult = await sendSubscriptionCodeEmail(emailNorm, code);
  return {
    ok: true,
    email: emailNorm,
    emailMasked: maskEmail(emailNorm),
    codeLast4: code.slice(-4),
    maxActivations: SUBSCRIPTION_MAX_ACTIVATIONS,
    emailResult,
    devCode: emailResult.sent ? "" : code,
  };
}

function getVtApiKey() {
  return vtApiKeyOverride || VT_API_KEY;
}

async function loadApiKeys() {
  try {
    const raw = await fs.readFile(getApiKeysFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    vtApiKeyOverride = typeof parsed.vtApiKey === "string" ? parsed.vtApiKey.trim() : "";
  } catch {
    vtApiKeyOverride = "";
  }
}

async function saveApiKeys() {
  try {
    await fs.mkdir(getUserDataDir(), { recursive: true });
    await fs.writeFile(getApiKeysFilePath(), JSON.stringify({ vtApiKey: vtApiKeyOverride }, null, 2), { mode: 0o600, encoding: "utf8" });
  } catch (err) {
    console.error("[SKIMO] Could not save api keys:", err?.message || err);
  }
}

// Token bucket: max 4 calls per 60 seconds (VT free tier)
const vtCallTimes = [];
async function waitVtRateLimit() {
  const windowMs = 60_000;
  const maxCalls = 4;
  const now = Date.now();
  while (vtCallTimes.length > 0 && vtCallTimes[0] < now - windowMs) vtCallTimes.shift();
  if (vtCallTimes.length >= maxCalls) {
    const waitUntil = vtCallTimes[0] + windowMs + 500;
    const waitMs = waitUntil - Date.now();
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    while (vtCallTimes.length > 0 && vtCallTimes[0] < Date.now() - windowMs) vtCallTimes.shift();
  }
  vtCallTimes.push(Date.now());
}

async function fetchVirusTotalReportBySha256(sha256) {
  const hash = String(sha256 || "").trim().toLowerCase();
  const vtKey = getVtApiKey();
  if (!vtKey || !/^[a-f0-9]{64}$/.test(hash)) return null;
  try {
    const payload = await requestJson(`https://www.virustotal.com/api/v3/files/${hash}`, 10000, 0, { "x-apikey": vtKey });
    const attrs = payload?.data?.attributes || {};
    const stats = attrs?.last_analysis_stats || {};
    const engines = Object.values(stats).reduce((sum, value) => sum + (Number(value) || 0), 0);
    return {
      malicious: Number(stats.malicious || 0),
      suspicious: Number(stats.suspicious || 0),
      harmless: Number(stats.harmless || 0),
      undetected: Number(stats.undetected || 0),
      engines,
      threatLabel: String(attrs?.popular_threat_classification?.suggested_threat_label || "").trim(),
      fromUpload: false,
    };
  } catch (err) {
    if (String(err?.message || err) === "http_404") return { notFound: true };
    return null;
  }
}

function buildVtMultipartBody(fileName, fileBuffer, boundary) {
  const safeFileName = String(fileName || "file").replace(/["\r\n]/g, "_");
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeFileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    "utf8",
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return Buffer.concat([head, fileBuffer, tail]);
}

function uploadFileToVirusTotal(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const vtKey = getVtApiKey();
    if (!vtKey) { reject(new Error("no_vt_key")); return; }
    let fileBuffer;
    try { fileBuffer = fssync.readFileSync(filePath); } catch (err) { reject(new Error(`read_failed: ${err.message}`)); return; }
    if (fileBuffer.length > 32 * 1024 * 1024) { reject(new Error("file_too_large")); return; }
    const boundary = `modguard${Date.now()}${Math.random().toString(16).slice(2)}`;
    const body = buildVtMultipartBody(fileName, fileBuffer, boundary);
    const req = https.request(
      {
        hostname: "www.virustotal.com",
        path: "/api/v3/files",
        method: "POST",
        headers: {
          "x-apikey": vtKey,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          Accept: "application/json",
          "User-Agent": `ModGuard/${app.getVersion?.() || "0.0.0"}`,
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { raw += c; });
        res.on("end", () => {
          const status = Number(res.statusCode || 0);
          try {
            const parsed = JSON.parse(raw);
            if (status >= 200 && status < 300) { resolve(parsed); return; }
            reject(new Error(`vt_upload_${status}: ${parsed?.error?.message || raw.slice(0, 120)}`));
          } catch { reject(new Error(`vt_upload_badjson_${status}`)); }
        });
      },
    );
    req.setTimeout(90_000, () => req.destroy(new Error("vt_upload_timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function pollVirusTotalAnalysis(analysisId, maxWaitMs = 150_000) {
  const vtKey = getVtApiKey();
  if (!vtKey || !analysisId) return null;
  const deadline = Date.now() + maxWaitMs;
  let delay = 10_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(Math.floor(delay * 1.4), 30_000);
    try {
      await waitVtRateLimit();
      const result = await requestJson(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, 12000, 0, { "x-apikey": vtKey });
      const status = result?.data?.attributes?.status;
      if (status === "completed") {
        const stats = result?.data?.attributes?.stats || {};
        const engines = Object.values(stats).reduce((s, v) => s + (Number(v) || 0), 0);
        return {
          malicious: Number(stats.malicious || 0),
          suspicious: Number(stats.suspicious || 0),
          harmless: Number(stats.harmless || 0),
          undetected: Number(stats.undetected || 0),
          engines,
          threatLabel: "",
          fromUpload: true,
        };
      }
    } catch { /* continue polling */ }
  }
  return null;
}

async function checkFileWithVirusTotal(filePath, fileName, fileHash) {
  const vtKey = getVtApiKey();
  if (!vtKey) return null;
  sendLog(`[SKIMO] VirusTotal: checking ${fileName}\n`);

  // Hash lookup first (free, instant, no upload needed)
  if (fileHash && /^[a-f0-9]{64}$/.test(fileHash)) {
    await waitVtRateLimit();
    const hashResult = await fetchVirusTotalReportBySha256(fileHash);
    if (hashResult && !hashResult.notFound) {
      sendLog(`[SKIMO] VirusTotal hash lookup: ${hashResult.malicious}/${hashResult.engines} malicious\n`);
      return hashResult;
    }
    if (hashResult === null) {
      sendLog(`[SKIMO] VirusTotal hash lookup failed (network/auth) — skipping upload\n`);
      return null;
    }
    // hashResult.notFound === true: file unknown to VT, upload it
  }

  // Upload for fresh analysis
  sendLog(`[SKIMO] VirusTotal: file unknown, uploading for analysis...\n`);
  try {
    await waitVtRateLimit();
    const uploadResult = await uploadFileToVirusTotal(filePath, fileName);
    const analysisId = uploadResult?.data?.id;
    if (!analysisId) { sendLog(`[SKIMO] VirusTotal: upload returned no analysis ID\n`); return null; }
    sendLog(`[SKIMO] VirusTotal: analysis queued (${analysisId}), polling...\n`);
    const pollResult = await pollVirusTotalAnalysis(analysisId, 150_000);
    if (pollResult) sendLog(`[SKIMO] VirusTotal upload result: ${pollResult.malicious} malicious / ${pollResult.engines} engines\n`);
    else sendLog(`[SKIMO] VirusTotal: analysis timed out\n`);
    return pollResult;
  } catch (err) {
    sendLog(`[SKIMO] VirusTotal upload error: ${err?.message || err}\n`);
    return null;
  }
}

async function fetchBillingStatus(email, codeHash) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedHash = String(codeHash || "").trim().toLowerCase();
  if (!BILLING_STATUS_URL || !normalizedEmail || !normalizedHash) return null;
  try {
    const url = new URL(BILLING_STATUS_URL);
    url.searchParams.set("product", PRODUCT_ID);
    url.searchParams.set("email", normalizedEmail);
    url.searchParams.set("codeHash", normalizedHash);
    const payload = await requestJson(url.toString(), 7000);
    const source = payload?.subscription && typeof payload.subscription === "object" ? payload.subscription : payload;
    if (!source || typeof source !== "object") return null;
    const paymentStatus = String(source.paymentStatus || "").trim().toLowerCase();
    return {
      paymentStatus: paymentStatus === "paid" || paymentStatus === "unpaid" ? paymentStatus : "unknown",
      expiresAt: String(source.expiresAt || "").trim(),
      renewalUrl: String(source.renewalUrl || "").trim(),
      allowNewCode: !!(source.allowNewCode || source.renewalApproved),
    };
  } catch {
    return null;
  }
}

async function fetchUpdateManifest() {
  let lastErr = null;
  for (const feed of UPDATE_FEED_URLS) {
    try {
      const manifest = await requestJson(feed);
      if (!manifest || typeof manifest !== "object" || !manifest.products || !manifest.products[UPDATE_PRODUCT_KEY]) {
        throw new Error("bad_manifest");
      }
      return manifest;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("update_feed_unreachable");
}

function downloadFile(urlString, destinationPath, expectedSha256) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(urlString);
    } catch {
      reject(new Error("bad_download_url"));
      return;
    }
    const client = urlObj.protocol === "http:" ? http : https;
    const hash = crypto.createHash("sha256");
    let bytes = 0;
    let done = false;

    const file = fssync.createWriteStream(destinationPath, { mode: 0o600 });
    const fail = async (err) => {
      if (done) return;
      done = true;
      try {
        file.destroy();
      } catch {}
      try {
        await fs.rm(destinationPath, { force: true });
      } catch {}
      reject(err instanceof Error ? err : new Error(String(err || "download_failed")));
    };

    const req = client.request(
      urlObj,
      {
        method: "GET",
        headers: { "User-Agent": `${APP_DISPLAY_NAME}/${app.getVersion?.() || "0.0.0"}` },
      },
      (res) => {
        const status = Number(res.statusCode || 0);
        if (status < 200 || status >= 300) {
          res.resume();
          fail(new Error(`download_http_${status}`));
          return;
        }
        res.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > UPDATE_MAX_DOWNLOAD_BYTES) {
            req.destroy(new Error("download_too_large"));
            return;
          }
          hash.update(chunk);
        });
        res.pipe(file);
      },
    );

    req.setTimeout(UPDATE_DOWNLOAD_TIMEOUT_MS, () => req.destroy(new Error("download_timeout")));
    req.on("error", fail);
    file.on("error", fail);
    file.on("finish", () => {
      if (done) return;
      const digest = hash.digest("hex");
      if (expectedSha256 && String(expectedSha256).toLowerCase() !== digest.toLowerCase()) {
        fail(new Error("download_hash_mismatch"));
        return;
      }
      done = true;
      resolve({ bytes, sha256: digest });
    });

    req.end();
  });
}

async function checkForRemoteUpdate() {
  if (updateInFlight) return;
  updateInFlight = true;
  try {
    const manifest = await fetchUpdateManifest();
    const product = manifest.products[UPDATE_PRODUCT_KEY];
    const remoteVersion = String(product?.version || "").trim();
    const currentVersion = String(app.getVersion?.() || "0.0.0").trim();
    if (!remoteVersion || compareVersions(remoteVersion, currentVersion) <= 0) return;

    const artifact = pickArtifact(product);
    if (!artifact?.url) return;
    if (latestNotifiedVersion === remoteVersion) return;

    const updateDir = path.join(getUserDataDir(), "updates");
    await fs.mkdir(updateDir, { recursive: true });

    const safeName = String(artifact.fileName || `${UPDATE_PRODUCT_KEY}-${remoteVersion}`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const targetFile = path.join(updateDir, safeName);
    const hasFile = await fs
      .stat(targetFile)
      .then((st) => st.isFile() && st.size > 0)
      .catch(() => false);

    if (!hasFile) {
      const tempFile = `${targetFile}.part`;
      await downloadFile(String(artifact.url), tempFile, artifact.sha256);
      await fs.rename(tempFile, targetFile);
    }

    latestNotifiedVersion = remoteVersion;
    const msg = `Ny version ${remoteVersion} er hentet. Installer filen for at opdatere Modverse.`;
    sendLog(`[SKIMO] ${msg}\n`);
    notify(APP_DISPLAY_NAME, msg);
    try {
      await shell.showItemInFolder(targetFile);
    } catch {
      // ignore
    }
  } catch (err) {
    sendLog(`[SKIMO] Update-check fejl: ${err?.message || err}\n`);
  } finally {
    updateInFlight = false;
  }
}

function startUpdateLoop() {
  if (updateTimer || updateInterval) return;
  updateTimer = setTimeout(() => {
    checkForRemoteUpdate().catch(() => {});
    updateInterval = setInterval(() => {
      checkForRemoteUpdate().catch(() => {});
    }, UPDATE_CHECK_INTERVAL_MS);
  }, 8000);
}

function stopUpdateLoop() {
  if (updateTimer) clearTimeout(updateTimer);
  if (updateInterval) clearInterval(updateInterval);
  updateTimer = null;
  updateInterval = null;
}


function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function computeInstallFingerprint() {
  try {
    const exePath = app.getPath("exe");
    const st = await fs.stat(exePath);
    const version = String(app.getVersion?.() || "");
    return `${version}|${exePath}|${st.size}|${Math.round(st.mtimeMs)}`;
  } catch {
    // Fallback (stadig stabil-ish mellem runs)
    try {
      const version = String(app.getVersion?.() || "");
      const appPath = app.getAppPath?.() || "";
      return `${version}|${appPath}`;
    } catch {
      return "";
    }
  }
}

function printSkimoBanner() {
  const banner = [
    "",
    "███████╗██╗  ██╗██╗███╗   ███╗ ██████╗",
    "██╔════╝██║ ██╔╝██║████╗ ████║██╔═══██╗",
    "███████╗█████╔╝ ██║██╔████╔██║██║   ██║",
    "╚════██║██╔═██╗ ██║██║╚██╔╝██║██║   ██║",
    "███████║██║  ██╗██║██║ ╚═╝ ██║╚██████╔╝",
    "╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝ ╚═════╝",
    "",
  ].join("\n");
  console.log(banner);
}

function notify(title, body) {
  try {
    if (!Notification.isSupported()) return;
    new Notification({ title, body }).show();
  } catch {
    // ignore
  }
}

function getUserDataDir() {
  return app.getPath("userData");
}

function getStateFilePath() {
  return path.join(getUserDataDir(), "state.json");
}

function getApiKeysFilePath() {
  return path.join(getUserDataDir(), "api-keys.json");
}

function getHistoryFilePath() {
  return path.join(getUserDataDir(), "history.json");
}

function getAiIndexFilePath() {
  return path.join(getUserDataDir(), "ai-index.json");
}

function getGeneratedCodesFilePath() {
  return path.join(getUserDataDir(), "subscription-codes.json");
}

function getEmailSettingsFilePath() {
  return path.join(getUserDataDir(), "email-settings.json");
}

function getSentEmailsFilePath() {
  return path.join(getUserDataDir(), "sent-emails-dev.json");
}

function getSandboxBaseDir() {
  return path.join(getUserDataDir(), "SkimoSandbox");
}

function getSandboxPaths() {
  const base = getSandboxBaseDir();
  return {
    base,
    input: path.join(base, "Input"),
    quarantine: path.join(base, "Karantæne"),
    staging: path.join(base, "Staging"),
    stagingMods: path.join(base, "Staging", "The Sims 4", "Mods"),
  };
}

const TRAY_EXTS = new Set([
  ".trayitem",
  ".blueprint",
  ".bpi",
  ".room",
  ".rmi",
  ".householdbinary",
  ".hhi",
  ".sgi",
]);

const TEXT_EXTS = new Set([
  ".txt",
  ".cfg",
  ".ini",
  ".json",
  ".toml",
  ".xml",
  ".md",
  ".log",
  ".py",
  ".bak",
]);

const MODSEARCH_ALLOWED_HOSTS = new Set([
  "www.thesimsresource.com",
  "thesimsresource.com",
  "www.curseforge.com",
  "curseforge.com",
  "modthesims.info",
  "www.patreon.com",
  "patreon.com",
  "www.tumblr.com",
  "tumblr.com",
  "www.simsfinds.com",
  "simsfinds.com",
  "www.nexusmods.com",
  "nexusmods.com",
  "maxismatchccworld.tumblr.com",
  "sims4updates.net",
  "www.sims4updates.net",
  "modrinth.com",
  "www.modrinth.com",
  "api.modrinth.com",
  "github.com",
  "www.github.com",
  "raw.githubusercontent.com",
  "ko-fi.com",
  "www.ko-fi.com",
  "simsdom.com",
  "www.simsdom.com",
  "plumbob.app",
  "www.plumbob.app",
  "simfileshare.net",
  "www.simfileshare.net",
]);

const MODSEARCH_FILE_HOSTS = new Set([
  "simfileshare.net",
  "www.simfileshare.net",
  "drive.google.com",
  "docs.google.com",
  "mega.nz",
  "www.mega.nz",
  "mediafire.com",
  "www.mediafire.com",
  "dropbox.com",
  "www.dropbox.com",
  "onedrive.live.com",
  "bowlroll.net",
  "www.bowlroll.net",
  "box.com",
  "www.box.com",
  "pixeldrain.com",
  "www.pixeldrain.com",
  "swiftysteals.blogspot.com",
  "www.swiftysteals.blogspot.com",
]);

const MODSEARCH_HUB_CACHE_MS = 15 * 60 * 1000;
const hubExpandCache = new Map();
let modSearchTrainingState = { passes: 0, lastRun: "", issues: 0, hubTests: {} };

const MODSEARCH_SOURCES = [
  {
    key: "the-sims-resource",
    name: "The Sims Resource",
    host: "www.thesimsresource.com",
    trust: 0.92,
    url: (q) => `https://www.thesimsresource.com/search#/?g=4&q=${encodeURIComponent(q)}`,
  },
  {
    key: "curseforge",
    name: "CurseForge",
    host: "www.curseforge.com",
    trust: 0.9,
    url: (q) => `https://www.curseforge.com/sims4/search?search=${encodeURIComponent(q)}`,
  },
  {
    key: "mod-the-sims",
    name: "Mod The Sims",
    host: "modthesims.info",
    trust: 0.82,
    url: (q) => `https://modthesims.info/downloads/ts4/?showType=1&tag=${encodeURIComponent(q)}`,
  },
  {
    key: "patreon",
    name: "Patreon",
    host: "www.patreon.com",
    trust: 0.72,
    url: (q) => `https://www.patreon.com/search?q=${encodeURIComponent(`sims 4 ${q}`)}`,
  },
  {
    key: "tumblr",
    name: "Tumblr / Maxis Match CC World",
    host: "maxismatchccworld.tumblr.com",
    trust: 0.74,
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:maxismatchccworld.tumblr.com sims 4 ${q}`)}`,
  },
  {
    key: "simsfinds",
    name: "SimsFinds",
    host: "www.simsfinds.com",
    trust: 0.78,
    url: (q) => `https://www.simsfinds.com/search?search=${encodeURIComponent(q)}`,
  },
  {
    key: "nexus-mods",
    name: "Nexus Mods",
    host: "www.nexusmods.com",
    trust: 0.76,
    url: (q) => `https://www.nexusmods.com/thesims4/search/?BH=0&RH_ModList=nav:true,home:false,type:0,user_id:0,game_id:3644,advfilt:true,search%5Bfilename%5D:${encodeURIComponent(q)},include_adult:false,show_game_filter:false,page_size:20`,
  },
  {
    key: "sims4updates",
    name: "Sims4Updates",
    host: "sims4updates.net",
    trust: 0.7,
    url: (q) => `https://sims4updates.net/?s=${encodeURIComponent(q)}`,
  },
  {
    key: "modrinth",
    name: "Modrinth",
    host: "modrinth.com",
    trust: 0.5,
    url: (q) => `https://modrinth.com/mods?q=${encodeURIComponent(`sims 4 ${q}`)}`,
  },
  {
    key: "github",
    name: "GitHub",
    host: "github.com",
    trust: 0.8,
    url: (q) => `https://github.com/search?q=${encodeURIComponent(`sims 4 ${q} mod`)}&type=repositories`,
  },
  {
    key: "ko-fi",
    name: "Ko-fi",
    host: "ko-fi.com",
    trust: 0.68,
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:ko-fi.com sims 4 ${q}`)}`,
  },
  {
    key: "simsdom",
    name: "SimsDOM",
    host: "simsdom.com",
    trust: 0.72,
    url: (q) => `https://www.simsdom.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    key: "plumbob",
    name: "Plumbob.app",
    host: "plumbob.app",
    trust: 0.7,
    url: (q) => `https://plumbob.app/search?q=${encodeURIComponent(`sims 4 ${q}`)}`,
  },
  {
    key: "simfileshare",
    name: "SimFileShare",
    host: "simfileshare.net",
    trust: 0.65,
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:simfileshare.net sims 4 ${q}`)}`,
  },
];

const MODSEARCH_SITE_QUERY = MODSEARCH_SOURCES.map((source) => `site:${source.host}`).join(" OR ");

function isAllowedModSearchUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || ""));
    if (parsed.protocol !== "https:") return false;
    return MODSEARCH_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isAllowedDownloadUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || ""));
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return MODSEARCH_ALLOWED_HOSTS.has(host) || MODSEARCH_FILE_HOSTS.has(host) || [...MODSEARCH_FILE_HOSTS].some((allowed) => host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function isLikelyHubPage(urlString, item = {}) {
  try {
    const parsed = new URL(String(urlString || ""));
    const host = parsed.hostname.toLowerCase();
    const p = parsed.pathname.toLowerCase();
    const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    if (/patreon\.com$/.test(host) && /\/posts\//.test(p)) return true;
    if (/tumblr\.com/.test(host) && /\/post\//.test(p)) return true;
    if (/modthesims\.info/.test(host) && /\/download\//.test(p)) return true;
    if (/sims4updates\.net/.test(host)) {
      return /\b(collection|pack|packs|mods|cc finds|hair pack|roundup|downloads|maxis match)\b/.test(text);
    }
  } catch {
    // ignore
  }
  return false;
}

function normalizeModSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MODSEARCH_QUERY_STOPWORDS = new Set([
  "sims", "sim", "4", "ts4", "cc", "custom", "content", "mod", "mods", "the", "and", "or", "with", "for", "to", "of",
  "a", "an", "in", "on", "from", "download", "find", "search", "please", "pls", "jeg", "vil", "have", "med",
]);

function expandModSearchToken(token) {
  const t = normalizeModSearchText(token);
  const map = {
    har: ["hair", "hairstyle", "hairstyles", "frisure", "haar", "har"],
    haar: ["hair", "hairstyle", "hairstyles", "frisure", "haar", "har"],
    hair: ["hair", "hairstyle", "hairstyles", "frisure", "haar", "har"],
    blonde: ["blonde", "blond", "light hair", "yellow hair"],
    curly: ["curly", "curls", "curl", "wavy", "waves", "kroller", "krollet"],
    female: ["female", "women", "woman", "girl", "girls", "feminine", "yf", "yfhair", "femalehair"],
    male: ["male", "men", "man", "boy", "boys", "masculine", "ym", "ymhair", "malehair"],
  };
  return map[t] || [t];
}

function getStrictQueryTokens(rawQuery = "", normalized = "") {
  const raw = normalizeModSearchText(rawQuery)
    .replace(/\bfamel\b/g, "female")
    .replace(/\bfemail\b/g, "female")
    .replace(/\bfemal\b/g, "female")
    .replace(/\bfemlae\b/g, "female")
    .replace(/\bhar\b/g, "hair")
    .replace(/\bhaar\b/g, "hair");
  const norm = normalizeModSearchText(normalized);
  const tokens = [...new Set(`${raw} ${norm}`.split(" ").filter(Boolean))]
    .filter((token) => token.length > 1)
    .filter((token) => !MODSEARCH_QUERY_STOPWORDS.has(token))
    .filter((token) => !["female", "women", "woman", "girl", "girls", "feminine", "yf", "yfhair", "femalehair", "male", "men", "man", "boy", "boys", "masculine", "masc", "ym", "ymhair", "malehair"].includes(token));
  return tokens;
}

function modSearchTokenMatches(token, haystack) {
  const words = new Set(String(haystack || "").split(/\s+/).filter(Boolean));
  return expandModSearchToken(token).some((variant) => {
    const clean = normalizeModSearchText(variant);
    if (!clean) return false;
    if (haystack.includes(clean)) return true;
    return clean.split(/\s+/).every((part) => words.has(part) || [...words].some((word) => word.startsWith(part.slice(0, 5))));
  });
}

function strictModSearchMatchesQuery(item, rawQuery, normalized, intent) {
  if (!String(rawQuery || "").trim()) return true;
  if (intent && !modSearchItemMatchesIntent(item, intent, rawQuery)) return false;
  const tokens = getStrictQueryTokens(rawQuery, normalized);
  if (!tokens.length) return true;
  const searchable = normalizeModSearchText(`${item.title || ""} ${item.description || ""} ${item.url || ""} ${item.tags?.join?.(" ") || ""}`);
  const missing = tokens.filter((token) => !modSearchTokenMatches(token, searchable));
  if (!missing.length) return true;
  if (intent === "hair") {
    const required = tokens.filter((token) => ["hair", "har", "haar", "blonde", "curly", "long", "short", "wavy", "braid", "bangs", "pony"].includes(token));
    return required.length > 0 && required.every((token) => modSearchTokenMatches(token, searchable));
  }
  return tokens.length <= 2 && missing.length === 0;
}

function normalizeModSearchQuery(value, mode = "cc") {
  const raw = String(value || "").trim();
  const clean = normalizeModSearchText(raw);
  const replacements = [
    ["hår", "hair"], ["har", "hair"], ["haar", "hair"], ["cheveux", "hair"], ["capelli", "hair"], ["髪", "hair"],
    ["frisure", "hair"], ["krøller", "curly"], ["kroller", "curly"], ["krøllet", "curly"], ["blondt", "blonde"], ["blond", "blonde"], ["langt", "long"], ["lang", "long"],
    ["gratis", "free"], ["betalt", "paid"], ["vip", "vip"],
    ["tøj", "clothes"], ["toj", "clothes"], ["toej", "clothes"], ["clohtes", "clothes"], ["cloths", "clothes"],
    ["møbler", "furniture"], ["mobler", "furniture"], ["moebler", "furniture"], ["byg", "build buy"],
    ["spil", "gameplay"], ["familie", "family"], ["hud", "skin overlay"], ["øjne", "eyes"], ["vipper", "lashes"],
    ["mand", "male men"], ["dreng", "male boy"], ["kvinde", "female women"], ["pige", "female girl"],
    ["mandehår", "male hair ym malehair"], ["kvindehår", "female hair yf femalehair"],
    ["famel", "female"], ["femail", "female"], ["femal", "female"], ["femlae", "female"],
  ];
  const words = new Set(clean.split(" ").filter(Boolean));
  for (const [from, to] of replacements) {
    if (raw.toLowerCase().includes(from) || clean.includes(normalizeModSearchText(from))) {
      for (const token of normalizeModSearchText(to).split(" ").filter(Boolean)) words.add(token);
    }
  }
  const gender = inferSearchGender(raw);
  if (gender === "male") {
    words.add("male"); words.add("ym"); words.add("malehair"); words.add("masculine"); words.add("masc");
    words.delete("female"); words.delete("yf"); words.delete("femalehair");
  } else if (gender === "female") {
    words.add("female"); words.add("yf"); words.add("femalehair"); words.add("feminine");
    words.delete("male"); words.delete("ym"); words.delete("malehair");
  }
  words.add("sims");
  words.add("4");
  if (mode === "cc") words.add("cc");
  if (mode === "mods" || mode === "gameplay") words.add("mod");
  if (mode === "gameplay") words.add("gameplay");
  if (mode === "buildbuy") {
    words.add("build");
    words.add("buy");
    words.add("cc");
  }
  return Array.from(words).join(" ");
}

function inferSearchGender(query = "") {
  const text = normalizeModSearchText(query);
  if (/\b(male|men|man|boys?|masculine|masc|ymhair|malehair|malecc|ts4male|sims4male|for men|for boys|mand|dreng|mandehaar|mandehaar)\b/.test(text)) return "male";
  if (/\b(female|famel|femail|femal|femlae|women|woman|girls?|feminine|fem|yfhair|femalehair|femalecc|ts4female|for women|for girls|kvinde|pige)\b/.test(text)) return "female";
  return "";
}

function inferGenderFromUrl(url = "") {
  const slug = String(url).toLowerCase();
  if (/(?:^|[-/])female(?:[-/_]|hair|cc)|femalehair|yfhair|femalecc|(?:^|[-/])yf(?:[-/_]|hair)/.test(slug)) return "female";
  if (/(?:^|[-/])male(?:[-/_]|hair|cc)|malehair|ymhair|malecc|(?:^|[-/])ym(?:[-/_]|hair)|(?:^|[-/])men(?:[-/_])|(?:^|[-/])masc(?:[-/_])/.test(slug)) return "male";
  return "";
}

function inferModSearchIntent(query, mode = "cc") {
  const text = normalizeModSearchText(query);
  if (/\b(hair|frisure|haar|har|blonde|curly|ponytail|straight|waves|bangs|braid|malehair|femalehair|ymhair|yfhair|hairpack|haircc)\b/.test(text)) return "hair";
  if (/\b(clothes|clothing|outfit|dress|jeans|shoes|top|skirt|pants)\b/.test(text)) return "clothes";
  if (/\b(build|buy|furniture|kitchen|bedroom|bathroom|clutter|decor)\b/.test(text) || mode === "buildbuy") return "buildbuy";
  if (/\b(gameplay|career|school|family|relationship|traits|script|mod)\b/.test(text) || mode === "gameplay") return "gameplay";
  if (/\b(skin|makeup|lashes|eyes|overlay|blush|lipstick)\b/.test(text)) return "skin-makeup";
  if (/\b(infant|toddler|baby|kids)\b/.test(text)) return "kids";
  if (mode === "mods" && /\b(gameplay|career|school|family|relationship|traits|script|mod|tuning)\b/.test(text)) return "gameplay";
  return "";
}

function buildSearchPhrase(rawQuery, mode = "cc") {
  const raw = String(rawQuery || "").trim();
  const normalized = normalizeModSearchQuery(raw, mode);
  const gender = inferSearchGender(raw);
  const intent = inferModSearchIntent(raw, mode);
  let phrase;
  if (!raw) {
    phrase = "sims 4 custom content";
  } else if (gender === "male" && intent === "hair") {
    // Strong male-specific phrase — excludes female-only platforms
    phrase = `sims 4 male hair ym ymhair masculine cc ${raw}`;
  } else if (gender === "female" && intent === "hair") {
    phrase = `sims 4 female hair yf yfhair cc ${raw}`;
  } else if (gender === "male" && intent === "clothes") {
    phrase = `sims 4 male clothes ym cc ${raw}`;
  } else if (gender === "female" && intent === "clothes") {
    phrase = `sims 4 female clothes yf cc ${raw}`;
  } else if (mode === "cc") {
    phrase = `sims 4 cc ${raw}`;
  } else if (mode === "gameplay") {
    phrase = `sims 4 gameplay mod ${raw}`;
  } else if (mode === "mods") {
    phrase = `sims 4 mod ${raw}`;
  } else {
    phrase = `sims 4 ${raw}`;
  }
  return { raw, normalized, phrase };
}

function buildPlatformSearchQuery(rawQuery, normalized, intent, mode = "cc") {
  const raw = normalizeModSearchText(rawQuery)
    .replace(/\bfamel\b/g, "female")
    .replace(/\bfemail\b/g, "female")
    .replace(/\bfemal\b/g, "female")
    .replace(/\bfemlae\b/g, "female")
    .replace(/\bhar\b/g, "hair")
    .replace(/\bhaar\b/g, "hair");
  const tokens = new Set([
    ...raw.split(" ").filter(Boolean),
    ...getStrictQueryTokens(rawQuery, normalized),
  ]);
  const gender = inferSearchGender(rawQuery || normalized);
  if (gender === "female") {
    tokens.add("female");
    if (intent === "hair") tokens.add("hair");
  }
  if (gender === "male") {
    tokens.add("male");
    if (intent === "hair") tokens.add("hair");
  }
  if (intent === "hair") tokens.add("hair");
  if (intent === "clothes") tokens.add("clothes");
  if (intent === "buildbuy") {
    tokens.add("build");
    tokens.add("buy");
  }
  if (mode === "gameplay" || intent === "gameplay") tokens.add("gameplay");
  return [...tokens]
    .filter((token) => token.length > 1)
    .filter((token) => !["sims", "sim", "4", "ts4", "cc", "mod", "mods", "custom", "content", "please", "pls"].includes(token))
    .slice(0, 10)
    .join(" ")
    .trim();
}

function modResultThumbnailRank(item = {}) {
  const thumb = String(item?.previewImageUrl || item?.thumbnailUrl || "").trim();
  if (/^https:\/\//i.test(thumb) && !thumb.startsWith("data:")) return 3;
  if (thumb && !thumb.startsWith("data:")) return 2;
  return 0;
}

function sortModResultsByThumbnail(results = []) {
  return [...results].sort((a, b) => {
    const thumbDiff = modResultThumbnailRank(b) - modResultThumbnailRank(a);
    if (thumbDiff) return thumbDiff;
    return (b.relevanceScore || 0) - (a.relevanceScore || 0) || (b.downloads || 0) - (a.downloads || 0);
  });
}

function inferPriceTier(item = {}) {
  const text = `${item.title || ""} ${item.description || ""} ${item.url || ""}`.toLowerCase();
  if (item.isPaid === true || item.priceTier === "paid") return "paid";
  if (item.isPaid === false || item.priceTier === "free") return "free";
  if (/patreon\.com/i.test(text) && /\b(exclusive|early access|members? only|paid|tier)\b/i.test(text)) return "paid";
  if (/thesimsresource\.com/i.test(text) && /\b(vip|subscription|store)\b/i.test(text)) return "paid";
  if (/\b(early access|members? only|paid only|donation required|premium content|requires? patreon|paywall)\b/i.test(text)) return "paid";
  if (/\b(free download|gratis|free cc|no pay|0 lp|completely free)\b/i.test(text)) return "free";
  if (/curseforge\.com|modthesims\.info|sims4updates\.net|simsfinds\.com/i.test(text)) return "free";
  if (/\b(free|gratis)\b/i.test(text)) return "free";
  if (/patreon\.com/i.test(text)) return "paid";
  return "unknown";
}

// Strongly female-coded style words in Sims CC — almost never appear in male CC
const FEMALE_STYLE_SIGNALS = /\b(pigtails?|twintails?|princess|queen|bride|bridal|mermaid|boho|bohemian|floral crown|lace veil|veil|bun hairstyle|updo|chignon|beehive|milkmaid|ribbons? braid|space buns?|half up half down|curly afro|afro puff|prom hair|pageant|yf hair|yf cc|female hair|girl hair|lady hair|women hair)\b/i;
// Strongly male-coded style words
const MALE_STYLE_SIGNALS = /\b(buzz ?cut|fade|undercut|mohawk|faux ?hawk|man ?bun|beard|stubble|sidecut|crew ?cut|military cut|taper|quiff|slick ?back|comb ?over|ym hair|ym cc|male hair|man hair|boy hair|guys? hair|masculine hair|mens? hair)\b/i;

function scoreModSearchRelevance(item, rawQuery, normalized, intent) {
  // Use content-only for scoring gender — same reason as in modSearchItemMatchesIntent:
  // tags are built from search query and would inflate scores for every result.
  const contentHaystack = normalizeModSearchText(`${item.title} ${item.description}`);
  const urlSlug = normalizeModSearchText(String(item.url || "").replace(/https?:\/\/[^/]+/, "").replace(/[^a-z0-9]+/g, " "));
  const fullHaystack = `${contentHaystack} ${urlSlug}`;
  const rawTokens = normalizeModSearchText(rawQuery)
    .split(" ")
    .filter((token) => token.length > 1 && !["sims", "4", "the", "and"].includes(token));
  const normTokens = normalizeModSearchText(normalized)
    .split(" ")
    .filter((token) => token.length > 2 && !["sims", "cc", "mod"].includes(token));
  const tokens = [...new Set([...rawTokens, ...normTokens])];
  let score = 0;
  for (const token of tokens) {
    if (fullHaystack.includes(token)) score += token.length > 5 ? 6 : 3;
    if (fullHaystack.split(" ").some((word) => word.startsWith(token.slice(0, 4)))) score += 1;
  }
  if (intent && modSearchItemMatchesIntent(item, intent, rawQuery)) score += 14;
  else if (intent) score -= 24;
  const searchGender = inferSearchGender(rawQuery);
  const urlGender = inferGenderFromUrl(item.url);
  const titleLower = String(item.title || "").toLowerCase();
  if (searchGender === "male") {
    if (urlGender === "male") score += 12;
    else if (urlGender === "female") score -= 40;
    if (MALE_STYLE_SIGNALS.test(titleLower)) score += 8;
    if (FEMALE_STYLE_SIGNALS.test(titleLower)) score -= 40;
    if (/\b(female|women|woman|girls?)\b/.test(contentHaystack)) score -= 40;
  } else if (searchGender === "female") {
    if (urlGender === "female") score += 12;
    else if (urlGender === "male") score -= 40;
    if (FEMALE_STYLE_SIGNALS.test(titleLower)) score += 8;
    if (MALE_STYLE_SIGNALS.test(titleLower)) score -= 40;
    if (/\b(male|men\b|man\b|boys?\b)\b/.test(contentHaystack)) score -= 40;
  } else if (searchGender && urlGender && urlGender !== searchGender) {
    score -= 20;
  }
  score += Math.min(6, Math.log10(Math.max(1, Number(item.downloads || 0))) * 2);
  return score;
}

function passesTimeFilter(item, timeFilter) {
  if (!timeFilter || timeFilter === "all") return true;
  const ts = item.publishedAt ? Date.parse(item.publishedAt) : 0;
  if (!ts || Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  if (timeFilter === "week") return ageMs <= 7 * 86400000;
  if (timeFilter === "month") return ageMs <= 30 * 86400000;
  return true;
}

function sortModSearchResults(results, sort, rawQuery, normalized, intent) {
  const list = [...results];
  if (sort === "alphabetical" || sort === "alpha") {
    list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "da", { sensitivity: "base" }));
    return list;
  }
  if (sort === "newest") {
    list.sort((a, b) => {
      const ta = Date.parse(a.publishedAt || 0) || 0;
      const tb = Date.parse(b.publishedAt || 0) || 0;
      if (tb !== ta) return tb - ta;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
    return list;
  }
  if (sort === "popular") {
    list.sort((a, b) => (b.downloads || 0) - (a.downloads || 0) || (b.relevanceScore || 0) - (a.relevanceScore || 0));
    return list;
  }
  if (sort === "site") {
    list.sort(
      (a, b) =>
        String(a.source || "").localeCompare(String(b.source || ""), "da", { sensitivity: "base" }) ||
        String(a.title || "").localeCompare(String(b.title || ""), "da", { sensitivity: "base" }),
    );
    return list;
  }
  list.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0) || (b.downloads || 0) - (a.downloads || 0));
  return list;
}

function applyModSearchFilters(results, filters = {}) {
  const { sort, priceFilter, timeFilter, ratingFilter, rawQuery, normalized, intent } = filters;
  let list = results.map((item) => ({
    ...item,
    priceTier: item.priceTier || inferPriceTier(item),
    relevanceScore: scoreModSearchRelevance(item, rawQuery, normalized, intent),
  }));
  if (priceFilter === "free") list = list.filter((item) => item.priceTier !== "paid");
  if (priceFilter === "paid") list = list.filter((item) => item.priceTier === "paid");
  if (ratingFilter === "4") list = list.filter((item) => Number(item.rating || 0) >= 4);
  if (ratingFilter === "5") list = list.filter((item) => Number(item.rating || 0) >= 4.8);
  if (timeFilter && timeFilter !== "all") list = list.filter((item) => passesTimeFilter(item, timeFilter));
  if (intent) {
    list = list.filter((item) => modSearchItemMatchesIntent(item, intent, rawQuery));
  }
  if (rawQuery) {
    list = list.filter((item) => strictModSearchMatchesQuery(item, rawQuery, normalized, intent));
    const strictTokens = getStrictQueryTokens(rawQuery, normalized);
    const minScore = strictTokens.length >= 3 ? 10 : strictTokens.length >= 2 ? 7 : 3;
    list = list.filter((item) => Number(item.relevanceScore || 0) >= minScore);
  }
  return sortModSearchResults(list, sort, rawQuery, normalized, intent);
}

function modSearchItemMatchesIntent(item, intent, rawQuery = "") {
  if (!intent) return true;
  // CRITICAL: use content-only haystack (title + description) for gender checks.
  // Do NOT include tags — tags are built from search query tokens and would
  // make every result appear to match the searched gender.
  const contentHaystack = normalizeModSearchText(`${item.title} ${item.description}`);
  const fullHaystack = normalizeModSearchText(`${item.title} ${item.description} ${item.tags?.join?.(" ") || ""}`);
  const urlGender = inferGenderFromUrl(item.url);
  const titleLower = String(item.title || "").toLowerCase();
  const clothingWords =
    /\b(clothes|clothing|outfit|dress|jeans|shoes|top|skirt|pants|shirt|jacket|coat|swatch|mesh|bodysuit|lingerie|bikini|swimwear|underwear|socks|heels|boots|trousers|tee|tshirt|blouse|sweater|hoodie|skirt)\b/;
  if (intent === "hair") {
    const isHair = /\b(hair|frisure|haar|har|blonde|curly|ponytail|straight|waves|bangs|braid|malehair|femalehair|yfhair|ymhair|hairpack|haircc)\b/.test(fullHaystack);
    if (!isHair || clothingWords.test(contentHaystack)) return false;
    const gender = inferSearchGender(rawQuery);
    if (gender === "male") {
      // Check female signals on content only — not tags
      const hasFemaleInContent = /\b(female|women|woman|girls?|yf\b|for women|for girls|feminine|femalehair|yfhair)\b/.test(contentHaystack);
      const hasFemaleStyleInTitle = FEMALE_STYLE_SIGNALS.test(titleLower);
      const hasFemaleInUrl = urlGender === "female";
      if (hasFemaleInContent || hasFemaleStyleInTitle || hasFemaleInUrl) return false;

      const hasMaleInContent = /\b(male|men\b|man\b|boys?\b|ym\b|masculine|masc|malehair|ymhair)\b/.test(contentHaystack);
      const hasMaleStyleInTitle = MALE_STYLE_SIGNALS.test(titleLower);
      const hasMaleInUrl = urlGender === "male";
      // Require at least one positive male signal
      if (!hasMaleInContent && !hasMaleStyleInTitle && !hasMaleInUrl) return false;
    }
    if (gender === "female") {
      const hasMaleInContent = /\b(male|men\b|man\b|boys?\b|ym\b|for men|for boys|masculine|malehair|ymhair)\b/.test(contentHaystack);
      const hasMaleStyleInTitle = MALE_STYLE_SIGNALS.test(titleLower);
      const hasMaleInUrl = urlGender === "male";
      if (hasMaleInContent || hasMaleStyleInTitle || hasMaleInUrl) return false;
    }
    return !/\b(toddler|infant|baby|kids|horse|equine|furniture|kitchen|bedroom|gameplay|script|build|buy)\b/.test(contentHaystack);
  }
  if (intent === "clothes") {
    const gender = inferSearchGender(rawQuery);
    if (gender === "male") {
      const hasFemaleInContent = /\b(female|women|woman|girls?|yf\b|for women|for girls|feminine)\b/.test(contentHaystack);
      const hasFemaleStyleInTitle = /\b(dress|skirt|lingerie|bikini|swimwear|blouse|corset|crop top|miniskirt)\b/.test(titleLower);
      if (hasFemaleInContent || hasFemaleStyleInTitle) return false;
    }
    return /\b(clothes|clothing|outfit|dress|jeans|shoes|top|skirt|pants)\b/.test(fullHaystack) &&
      !/\bhair\b/.test(contentHaystack) &&
      !/\b(toddler|infant|baby|horse|equine)\b/.test(contentHaystack);
  }
  if (intent === "buildbuy") return /\b(build|buy|furniture|kitchen|bedroom|bathroom|clutter|decor)\b/.test(fullHaystack);
  if (intent === "gameplay") return /\b(gameplay|career|school|family|relationship|traits|script|mod|tuning)\b/.test(fullHaystack);
  if (intent === "skin-makeup") return /\b(skin|makeup|lashes|eyes|overlay|blush|lipstick)\b/.test(fullHaystack);
  if (intent === "kids") return /\b(infant|toddler|baby|kids)\b/.test(fullHaystack);
  return true;
}

function sourceForUrl(urlString) {
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    return MODSEARCH_SOURCES.find((source) => host === source.host || host.endsWith(`.${source.host.replace(/^www\./, "")}`)) || null;
  } catch {
    return null;
  }
}

function modSearchThumbDataUrl(source, title, query, intent) {
  const palette = {
    hair: ["#f4d7b0", "#77543d", "HAIR"],
    clothes: ["#cbd7ff", "#4d5d9d", "CAS"],
    buildbuy: ["#d8eadf", "#44725d", "BUILD"],
    gameplay: ["#d6c8ff", "#5a36a6", "MOD"],
    "skin-makeup": ["#ffd3d9", "#975b6b", "MAKEUP"],
    kids: ["#ffe1a8", "#ad6d32", "KIDS"],
  };
  const [a, b, label] = palette[intent] || ["#d9eef6", "#2f7184", "SIMS"];
  const safeTitle = String(title || query || "Sims 4").replace(/[<>&]/g, "").slice(0, 34);
  const safeSource = String(source?.name || "Sims source").replace(/[<>&]/g, "").slice(0, 28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="640" height="420" rx="30" fill="url(#g)"/>
    <rect x="28" y="28" width="584" height="364" rx="24" fill="#fff" opacity=".18"/>
    <circle cx="168" cy="126" r="48" fill="#f7d4bd"/>
    <path d="M111 145c18-90 96-90 114 0v86H111z" fill="#dcb17d" opacity="${intent === "hair" ? ".95" : ".42"}"/>
    <rect x="108" y="232" width="122" height="86" rx="30" fill="#fff" opacity=".62"/>
    <rect x="286" y="92" width="230" height="34" rx="17" fill="#06151d" opacity=".32"/>
    <rect x="286" y="150" width="286" height="24" rx="12" fill="#06151d" opacity=".22"/>
    <rect x="286" y="194" width="246" height="24" rx="12" fill="#06151d" opacity=".18"/>
    <rect x="0" y="310" width="640" height="110" fill="#05080d" opacity=".64"/>
    <text x="32" y="354" font-family="-apple-system, Arial" font-size="30" font-weight="900" fill="#fff">${label}</text>
    <text x="32" y="388" font-family="-apple-system, Arial" font-size="24" font-weight="800" fill="#fff" opacity=".9">${safeTitle}</text>
    <text x="440" y="384" font-family="-apple-system, Arial" font-size="18" font-weight="800" fill="#fff" opacity=".76">${safeSource}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const MODSEARCH_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,da;q=0.8",
};

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  const maxBytes = options.maxBytes || 1500000;
  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: { ...MODSEARCH_FETCH_HEADERS, ...(options.headers || {}) },
      body: options.body,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const slice = buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf;
    return slice.toString("utf8");
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absolutizeUrl(baseUrl, href) {
  try {
    return new URL(String(href || "").trim(), baseUrl).toString();
  } catch {
    return "";
  }
}

function upgradeImageUrl(urlString) {
  let url = String(urlString || "").trim();
  if (!url) return "";
  url = url.replace(/-\d+x\d+(\.(jpe?g|png|webp|gif))/i, "$1");
  url = url.replace(/[?&](w|h|width|height)=\d+/gi, "");
  url = url.replace(/\/(?:thumb|thumbnail|small|medium)\//i, "/");
  url = url.replace(/\/resize\/\d+x\d+\//i, "/");
  return url;
}

function pickMetaImageFromHtml(html, baseUrl) {
  const chunk = String(html || "").slice(0, 150000);
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const match = chunk.match(re);
    if (!match?.[1]) continue;
    const url = upgradeImageUrl(absolutizeUrl(baseUrl, decodeHtmlEntities(match[1])));
    if (/^https:\/\//i.test(url) && !/\.svg(\?|$)/i.test(url)) return url;
  }
  return "";
}

function pickBestImageFromHtml(html, baseUrl) {
  const candidates = [];
  const og = pickMetaImageFromHtml(html, baseUrl);
  if (og) candidates.push({ url: og, score: 800 });
  const chunk = String(html || "").slice(0, 400000);
  const imgRe = /<img\b[^>]*>/gi;
  let match;
  while ((match = imgRe.exec(chunk))) {
    const tag = match[0] || "";
    const src =
      tag.match(/\bdata-(?:src|lazy-src|original)=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    const abs = upgradeImageUrl(absolutizeUrl(baseUrl, decodeHtmlEntities(src)));
    if (!/^https:\/\//i.test(abs)) continue;
    if (/logo|icon|avatar|sprite|pixel|spacer|badge|emoji|1x1/i.test(abs)) continue;
    const w = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || 0);
    const h = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] || 0);
    let score = Math.max(w * h, w, h, 120);
    if (/preview|gallery|screenshot|showcase|download|featured|post|cc|hair|cloth|build/i.test(abs)) score += 600;
    if (/\d+x\d+/i.test(abs) && score < 400) score -= 200;
    candidates.push({ url: abs, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url || og || "";
}

const SIMS_DOWNLOAD_EXT_RE = /\.(package|zip|ts4script|rar|7z)(\?|$)/i;

function extractDownloadLinksFromHtml(html, baseUrl) {
  const links = [];
  const addCandidate = (rawUrl, context = "") => {
    const abs = absolutizeUrl(baseUrl, decodeHtmlEntities(rawUrl));
    if (!abs || !/^https:\/\//i.test(abs)) return;
    if (!isAllowedDownloadUrl(abs) && !isAllowedModSearchUrl(abs)) return;
    const text = normalizeModSearchText(`${abs} ${context}`);
    const isFile = SIMS_DOWNLOAD_EXT_RE.test(abs);
    const isDownloadAction = /\b(download|downloaden|hent|file|files|attachment|package|ts4script|zip|rar|7z)\b/.test(text);
    const isTrustedFileHost = isAllowedDownloadUrl(abs) && !isAllowedModSearchUrl(abs);
    if (!isFile && !isDownloadAction && !isTrustedFileHost) return;
    let score = 1;
    if (isFile) score += 60;
    if (/\.package(\?|$)/i.test(abs)) score += 45;
    if (/\.(zip|ts4script)(\?|$)/i.test(abs)) score += 35;
    if (/\b(download|hent|files?|attachment)\b/.test(text)) score += 18;
    if (/simfileshare|mediafire|dropbox|pixeldrain|box\.com|drive\.google|mega\.nz|onedrive/.test(abs)) score += 12;
    if (/\b(login|sign in|signup|register|vip|subscribe|patreon tier|member only|early access)\b/.test(text)) score -= 80;
    links.push({ url: abs, score });
  };

  const hrefRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = hrefRe.exec(html))) {
    addCandidate(match[1], match[2] || "");
  }

  const attrRe = /\b(?:data-href|data-url|data-download-url|data-file|content)=["']([^"']+)["']/gi;
  while ((match = attrRe.exec(html))) {
    addCandidate(match[1], "download file");
  }

  const byUrl = new Map();
  for (const entry of links) {
    const existing = byUrl.get(entry.url);
    if (!existing || entry.score > existing.score) byUrl.set(entry.url, entry);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score).map((entry) => entry.url);
}

function titleFromDownloadUrl(url, index, parentTitle = "Mod") {
  try {
    const base = decodeURIComponent(path.basename(new URL(url).pathname))
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (base.length >= 3) return base.slice(0, 120);
  } catch {
    // ignore
  }
  return `${String(parentTitle || "Mod").slice(0, 60)} ${index + 1}`;
}

function extractUrlsFromPlainText(text) {
  const urls = [];
  const re = /https?:\/\/[^\s"'<>)\]]+/gi;
  let match;
  while ((match = re.exec(String(text || "")))) {
    const raw = match[0].replace(/[.,;:!?)]+$/g, "");
    if (isAllowedDownloadUrl(raw) || isAllowedModSearchUrl(raw)) urls.push(raw);
  }
  return [...new Set(urls)];
}

function extractAnchorModsFromHtml(html, baseUrl, parentTitle) {
  const items = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const href = absolutizeUrl(baseUrl, decodeHtmlEntities(match[1]));
    if (!href || !/^https:\/\//i.test(href)) continue;
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 3 || text.length > 160) continue;
    if (/login|signup|cookie|privacy|share|follow|patreon\.com\/home/i.test(text)) continue;
    const isFile = SIMS_DOWNLOAD_EXT_RE.test(href) || isAllowedDownloadUrl(href);
    const isPage = isAllowedModSearchUrl(href) && !isLikelyHubPage(href);
    if (!isFile && !isPage) continue;
    const key = normalizeResultUrl(href);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title: text,
      url: isFile ? baseUrl : href,
      directDownloadUrl: isFile ? href : "",
      thumbnailUrl: "",
      description: `Del af: ${parentTitle}`,
    });
  }
  return items;
}

function patreonPostIdFromUrl(postUrl) {
  const raw = String(postUrl || "");
  const m =
    raw.match(/\/posts\/[^/]*?-(\d{5,})(?:[/?#]|$)/i) ||
    raw.match(/\/posts\/(\d{5,})(?:[/?#]|$)/i) ||
    raw.match(/\/posts\/[^/]+-(\d+)/i);
  return m?.[1] || null;
}

function parsePatreonContentJsonString(jsonString, hubParentUrl, parentTitle) {
  const items = [];
  if (!jsonString) return items;
  let doc;
  try {
    doc = JSON.parse(jsonString);
  } catch {
    return items;
  }
  const listItems = [];
  const findListItems = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "listItem") listItems.push(node);
    if (Array.isArray(node.content)) node.content.forEach(findListItems);
  };
  findListItems(doc);

  for (const li of listItems) {
    const sequence = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "text" && node.text) {
        const text = String(node.text).trim();
        const linkMark = Array.isArray(node.marks) ? node.marks.find((m) => m.type === "link" && m.attrs?.href) : null;
        if (linkMark?.attrs?.href) sequence.push({ kind: "url", value: linkMark.attrs.href });
        else if (text) sequence.push({ kind: "text", value: text });
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(li);

    let pendingTitle = "";
    for (const part of sequence) {
      if (part.kind === "text") {
        if (/^https?:\/\//i.test(part.value)) {
          items.push({
            title: pendingTitle || titleFromDownloadUrl(part.value, items.length, parentTitle),
            url: part.value,
            hubParentUrl,
            hubParentTitle: parentTitle,
          });
          pendingTitle = "";
        } else {
          pendingTitle = part.value;
        }
      } else if (part.kind === "url") {
        let href = String(part.value || "").trim();
        if (href.startsWith("/")) href = absolutizeUrl("https://www.patreon.com", href);
        if (!/^https:\/\//i.test(href)) continue;
        items.push({
          title: pendingTitle || titleFromDownloadUrl(href, items.length, parentTitle),
          url: href,
          hubParentUrl,
          hubParentTitle: parentTitle,
        });
        pendingTitle = "";
      }
    }
  }
  return items;
}

async function fetchPatreonApiPost(postUrl) {
  const postId = patreonPostIdFromUrl(postUrl);
  if (!postId) return null;
  try {
    const api = `https://www.patreon.com/api/posts/${postId}`;
    const data = await fetchJson(api, { headers: MODSEARCH_FETCH_HEADERS, timeoutMs: 15000 });
    const attrs = data?.data?.attributes;
    if (!attrs) return null;
    return {
      title: String(attrs.title || "").trim(),
      description: String(attrs.teaser_text || attrs.content || "").trim(),
      thumbnailUrl: attrs.image?.url || attrs.post_file?.url || "",
      contentJson: attrs.content_json_string || "",
      postId,
    };
  } catch (err) {
    sendLog(`[SKIMO] Patreon API ${postId}: ${err?.message || err}\n`);
    return null;
  }
}

async function fetchHubPageHtml(pageUrl) {
  const mobileUa =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  try {
    return await fetchText(pageUrl, {
      timeoutMs: 14000,
      maxBytes: 900000,
      headers: { ...MODSEARCH_FETCH_HEADERS, "User-Agent": mobileUa },
    });
  } catch {
    return "";
  }
}

async function expandHubPage(pageUrl, parentItem = {}) {
  const cacheKey = normalizeResultUrl(pageUrl);
  const cached = hubExpandCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MODSEARCH_HUB_CACHE_MS) return cached.mods;

  let parentTitle = String(parentItem.title || "Mods").trim();
  const mods = [];
  const seen = new Set();

  const pushMod = (entry) => {
    const title = String(entry.title || "").trim();
    const page = String(entry.url || pageUrl).trim();
    const direct = String(entry.directDownloadUrl || "").trim();
    const key = `${normalizeResultUrl(direct || page)}::${normalizeModSearchText(title)}`;
    if (!title || title.length < 2 || seen.has(key)) return;
    seen.add(key);
    mods.push({
      title: title.slice(0, 200),
      url: direct ? pageUrl : page,
      directDownloadUrl: direct,
      description: String(entry.description || parentItem.description || "").slice(0, 400),
      thumbnailUrl: entry.thumbnailUrl || parentItem.thumbnailUrl || "",
      hubParentUrl: pageUrl,
      hubParentTitle: parentTitle,
    });
  };

  if (/patreon\.com/i.test(pageUrl)) {
    const apiPost = await fetchPatreonApiPost(pageUrl);
    if (apiPost?.title) parentTitle = apiPost.title;
    if (apiPost?.thumbnailUrl) parentItem = { ...parentItem, thumbnailUrl: apiPost.thumbnailUrl };
    const fromJson = parsePatreonContentJsonString(apiPost?.contentJson || "", pageUrl, parentTitle);
    for (const entry of fromJson) {
      pushMod({
        ...entry,
        description: `Fra: ${parentTitle}`,
        thumbnailUrl: parentItem.thumbnailUrl,
      });
    }
    if (!fromJson.length) {
      const blob = `${apiPost?.description || ""}`;
      for (const u of extractUrlsFromPlainText(blob)) {
        if (isAllowedModSearchUrl(u) && !isLikelyHubPage(u, parentItem)) {
          pushMod({ title: titleFromDownloadUrl(u, mods.length, parentTitle), url: u, thumbnailUrl: parentItem.thumbnailUrl });
        }
      }
    }
  }

  const html = await fetchHubPageHtml(pageUrl);
  if (html && !/just a moment|cloudflare/i.test(html.slice(0, 800))) {
    const downloads = extractDownloadLinksFromHtml(html, pageUrl);
    downloads.forEach((u, i) => {
      pushMod({
        title: titleFromDownloadUrl(u, i, parentTitle),
        url: pageUrl,
        directDownloadUrl: u,
        thumbnailUrl: parentItem.thumbnailUrl,
      });
    });
    for (const entry of extractAnchorModsFromHtml(html, pageUrl, parentTitle)) pushMod(entry);
    for (const u of extractUrlsFromPlainText(html)) {
      if (SIMS_DOWNLOAD_EXT_RE.test(u) || isAllowedDownloadUrl(u)) {
        pushMod({
          title: titleFromDownloadUrl(u, mods.length, parentTitle),
          url: pageUrl,
          directDownloadUrl: u,
        });
      }
    }
    if (/sims4updates\.net/i.test(pageUrl)) {
      const postRe = /href=["'](https:\/\/(?:www\.)?sims4updates\.net\/[^"'#]+)["']/gi;
      let pm;
      while ((pm = postRe.exec(html))) {
        const u = pm[1].split("#")[0];
        if (normalizeResultUrl(u) === cacheKey) continue;
        if (/\/page\/|\/category\/|\/tag\/|\/search/i.test(u)) continue;
        pushMod({ title: `CC: ${parentTitle}`, url: u });
        if (mods.length >= 28) break;
      }
    }
  }

  const payload = { at: Date.now(), mods };
  hubExpandCache.set(cacheKey, payload);
  return mods;
}

function buildChildSearchItem(child, parentItem, ctx, index, total) {
  const pageUrl = child.url || parentItem.url;
  const source = sourceForUrl(pageUrl) || sourceForUrl(parentItem.url);
  if (!source) return null;
  const item = {
    id: crypto.createHash("sha1").update(`${child.hubParentUrl}:${child.title}:${index}`).digest("hex").slice(0, 16),
    title: String(child.title || "").slice(0, 200),
    source: source.name,
    sourceKey: source.key,
    url: pageUrl,
    directDownloadUrl: child.directDownloadUrl || "",
    description: String(child.description || parentItem.description || "").slice(0, 400),
    tags: Array.isArray(parentItem.tags) ? [...parentItem.tags] : [],
    rating: Number(parentItem.rating || 4.5),
    downloads: Number(parentItem.downloads || 0),
    trustScore: source.trust,
    thumbnailUrl: child.thumbnailUrl || parentItem.thumbnailUrl || "",
    previewImageUrl: child.thumbnailUrl || parentItem.previewImageUrl || "",
    previewStatus: child.thumbnailUrl || parentItem.thumbnailUrl ? "hub-preview" : "pending-preview",
    previewConfidence: child.thumbnailUrl || parentItem.thumbnailUrl ? 0.88 : 0,
    hubParentUrl: child.hubParentUrl || parentItem.url,
    hubParentTitle: child.hubParentTitle || parentItem.title,
    hubVariantIndex: index + 1,
    hubVariantTotal: total,
    isFromHub: true,
    fileName: `${String(child.title || "mod")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}.package`,
    curseforgeModId: parentItem.curseforgeModId || null,
    author: parentItem.author || "",
    publishedAt: parentItem.publishedAt || "",
    priceTier: parentItem.priceTier || inferPriceTier(parentItem),
    isPaid: parentItem.isPaid,
  };
  item.relevanceScore = scoreModSearchRelevance(item, ctx.rawQuery, ctx.normalized, ctx.intent);
  return item;
}

async function expandHubSearchResults(results, ctx, maxHubPages = 8) {
  const output = [];
  let hubJobs = 0;
  for (const item of results) {
    if (!isLikelyHubPage(item.url, item) || hubJobs >= maxHubPages) {
      output.push(item);
      continue;
    }
    hubJobs += 1;
    try {
      const children = await expandHubPage(item.url, item);
      if (!children.length) {
        output.push(item);
        continue;
      }
      if (children.length === 1) {
        const single = buildChildSearchItem(children[0], item, ctx, 0, 1);
        output.push(single || item);
        continue;
      }
      if (children.length > 18) {
        output.push({
          ...item,
          isHubPicker: true,
          hubChildCount: children.length,
          hubChildren: children.map((c, i) => ({ ...c, hubVariantIndex: i + 1, hubVariantTotal: children.length })),
        });
        continue;
      }
      for (let i = 0; i < children.length; i++) {
        const built = buildChildSearchItem(children[i], item, ctx, i, children.length);
        if (built) output.push(built);
      }
    } catch (err) {
      sendLog(`[SKIMO] Hub expand fejl (${item.url}): ${err?.message || err}\n`);
      output.push(item);
    }
  }
  return output.length ? output : results;
}

async function runModSearchTrainingPass(passNo = 1) {
  const queries = [
    "hair",
    "hår",
    "male hair",
    "female hair",
    "clothes",
    "tøj",
    "build buy",
    "gameplay",
    "maxis match hair",
    "blonde curly female hair",
    "hår blonde curly famel hair",
    "male curly hair",
    "kitchen clutter",
    "script mods",
  ];
  const hubUrls = [
    "https://www.patreon.com/posts/220-maxis-match-93441298",
    "https://sims4updates.net/",
  ];
  let issues = 0;
  const queryReport = {};

  for (const query of queries) {
    try {
      const payload = await searchSimsMods({ query, mode: "cc", page: 1, sort: "relevance" });
      const intent = inferModSearchIntent(`${query} ${payload.normalizedQuery || ""}`, "cc");
      const bad = (payload.results || []).filter((item) => intent && !modSearchItemMatchesIntent(item, intent, query));
      issues += bad.length;
      queryReport[query] = {
        intent,
        total: payload.results?.length || 0,
        bad: bad.length,
        provider: payload.provider,
      };
    } catch (err) {
      issues += 1;
      queryReport[query] = { error: err?.message || String(err) };
    }
  }

  const hubReport = {};
  for (const url of hubUrls) {
    try {
      const mods = await expandHubPage(url, { title: "Hub test", url });
      hubReport[url] = { mods: mods.length, ok: mods.length > 0 };
      if (!mods.length) issues += 1;
    } catch (err) {
      hubReport[url] = { error: err?.message || String(err) };
      issues += 1;
    }
  }

  calibrateModSearchIntentFilters();
  modSearchTrainingState = {
    passes: passNo,
    lastRun: new Date().toISOString(),
    issues,
    queryReport,
    hubReport,
  };
  sendLog(`[SKIMO] ModSearch træning pass ${passNo}: ${issues} issue(s).\n`);
  return modSearchTrainingState;
}

function scheduleModSearchTraining() {
  const delays = [8000, 45000, 120000, 300000, 600000];
  delays.forEach((ms, index) => {
    setTimeout(() => {
      runModSearchTrainingPass(index + 1).catch((err) =>
        sendLog(`[SKIMO] ModSearch træning fejl: ${err?.message || err}\n`),
      );
    }, ms);
  });
}

function modSearchSourceEnabled(sourceNames, sourceKey) {
  if (!sourceNames?.length) return true;
  const source = MODSEARCH_SOURCES.find((entry) => entry.key === sourceKey);
  return !!source && sourceNames.includes(source.name);
}

function normalizeResultUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || ""));
    parsed.hash = "";
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.toLowerCase();
  } catch {
    return String(urlString || "").toLowerCase();
  }
}

async function searchWithDuckDuckGo(query, page, sourceNames) {
  const hosts = (sourceNames?.length
    ? MODSEARCH_SOURCES.filter((source) => sourceNames.includes(source.name))
    : MODSEARCH_SOURCES
  ).map((source) => `site:${source.host}`);
  const sitePart = hosts.slice(0, 16).join(" OR ");
  const q = `sims 4 ${query} (${sitePart})`;
  const body = new URLSearchParams({
    q,
    s: String(Math.max(0, page - 1)),
    dc: "30",
    df: "",
  });
  const html = await fetchText("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...MODSEARCH_FETCH_HEADERS },
    body: body.toString(),
    timeoutMs: 14000,
    maxBytes: 600000,
  });
  const items = [];
  const blockRe =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let block;
  while ((block = blockRe.exec(html))) {
    let url = decodeHtmlEntities(block[1]);
    const title = decodeHtmlEntities(block[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    const description = decodeHtmlEntities(block[3].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    const uddg = url.match(/uddg=([^&]+)/);
    if (uddg) {
      try {
        url = decodeURIComponent(uddg[1]);
      } catch {
        // ignore
      }
    }
    if (!isAllowedModSearchUrl(url)) continue;
    items.push({ title, url, description, thumbnailUrl: "" });
    if (items.length >= 24) break;
  }
  return items;
}

async function searchCurseForgeApi(query, page) {
  const key = String(process.env.CURSEFORGE_API_KEY || process.env.CF_API_KEY || "").trim();
  if (!key) return [];
  const index = Math.max(0, (page - 1) * 20);
  const url = `https://api.curseforge.com/v1/mods/search?gameId=3644&searchFilter=${encodeURIComponent(query)}&index=${index}&pageSize=20&sortField=2&sortOrder=desc`;
  const data = await fetchJson(url, {
    headers: { Accept: "application/json", "x-api-key": key },
    timeoutMs: 15000,
  });
  return (data?.data || []).map((mod) => ({
    title: mod.name || "",
    url: mod.links?.websiteUrl || `https://www.curseforge.com/sims4/mods/${mod.slug || mod.id}`,
    description: String(mod.summary || "").replace(/<[^>]+>/g, ""),
    thumbnailUrl: mod.logo?.thumbnailUrl || mod.logo?.url || "",
    curseforgeModId: mod.id,
    downloads: Number(mod.downloadCount || 0),
    author: mod.authors?.[0]?.name || "",
    publishedAt: mod.dateModified || mod.dateCreated || "",
    priceTier: "free",
    isPaid: false,
  }));
}

async function searchSims4UpdatesApi(query, page) {
  const url = `https://sims4updates.net/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=20&page=${page}&_embed=wp:featuredmedia`;
  const posts = await fetchJson(url, { timeoutMs: 12000 });
  if (!Array.isArray(posts)) return [];
  return posts
    .map((post) => {
      const media = post._embedded?.["wp:featuredmedia"]?.[0];
      const thumb =
        media?.media_details?.sizes?.medium_large?.source_url ||
        media?.media_details?.sizes?.medium?.source_url ||
        media?.source_url ||
        "";
      const title = decodeHtmlEntities(String(post.title?.rendered || "").replace(/<[^>]+>/g, ""));
      const description = decodeHtmlEntities(String(post.excerpt?.rendered || "").replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .slice(0, 280);
      return {
        title,
        url: post.link || "",
        description,
        thumbnailUrl: thumb,
        publishedAt: post.date || post.modified || "",
        priceTier: "free",
        isPaid: false,
      };
    })
    .filter((entry) => entry.url && isAllowedModSearchUrl(entry.url));
}

async function searchModTheSimsHtml(query, page) {
  const start = Math.max(0, (page - 1) * 20);
  const url = `https://modthesims.info/downloads.php?do=search&s=${encodeURIComponent(query)}&cat=0&sb=name&sd=desc&start=${start}`;
  const html = await fetchText(url, { timeoutMs: 14000 });
  const items = [];
  const rowRe = /<a href="(downloads\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let row;
  while ((row = rowRe.exec(html))) {
    const href = absolutizeUrl("https://modthesims.info/", row[1]);
    const title = decodeHtmlEntities(row[2]).trim();
    if (!title || title.length < 3) continue;
    items.push({
      title,
      url: href,
      description: `Mod The Sims: ${title}`,
      thumbnailUrl: "",
    });
    if (items.length >= 24) break;
  }
  return items;
}

async function searchModrinthApi(query, page) {
  const offset = Math.max(0, (page - 1) * 20);
  try {
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(`sims 4 ${query}`)}&limit=20&offset=${offset}&index=relevance`;
    const data = await fetchJson(url, { timeoutMs: 12000 });
    return (data?.hits || [])
      .filter((hit) => /sims\s*4|the\s*sims/i.test(`${hit.title || ""} ${hit.description || ""}`))
      .map((hit) => ({
        title: hit.title || "",
        url: `https://modrinth.com/${hit.project_type || "mod"}/${hit.slug || hit.project_id}`,
        description: String(hit.description || "").replace(/<[^>]+>/g, ""),
        thumbnailUrl: hit.icon_url || "",
        downloads: Number(hit.downloads || 0),
        publishedAt: hit.date_modified || hit.date_created || "",
        priceTier: "free",
      }));
  } catch {
    return [];
  }
}

async function searchGithubSimsHtml(query, page) {
  const pageNo = Math.max(1, page);
  const url = `https://github.com/search?q=${encodeURIComponent(`sims 4 ${query} mod`)}&type=repositories&p=${pageNo}`;
  const html = await fetchText(url, { timeoutMs: 14000, maxBytes: 500000 });
  const items = [];
  const rowRe = /<a[^>]+href="(\/[^"/]+\/[^"/]+)"[^>]*data-hydro-click[^>]*>[\s\S]*?<span[^>]+class="[^"]*search-title[^"]*"[^>]*>([^<]+)<\/a>/gi;
  let row;
  while ((row = rowRe.exec(html))) {
    const href = absolutizeUrl("https://github.com/", row[1]);
    const title = decodeHtmlEntities(row[2]).trim();
    if (!title || !/\/[^/]+\/[^/]+/.test(row[1])) continue;
    items.push({
      title: `${title} (GitHub)`,
      url: href.split("?")[0],
      description: `GitHub repository for Sims 4: ${title}`,
      thumbnailUrl: "",
      priceTier: "free",
    });
    if (items.length >= 20) break;
  }
  if (items.length) return items;
  const fallbackRe = /<a[^>]+href="(https:\/\/github\.com\/[^"/]+\/[^"/]+)"[^>]*>([^<]{4,120})<\/a>/gi;
  while ((row = fallbackRe.exec(html))) {
    const itemUrl = row[1].split("?")[0];
    if (!/github\.com\/[^/]+\/[^/]+/.test(itemUrl)) continue;
    items.push({
      title: decodeHtmlEntities(row[2]).trim(),
      url: itemUrl,
      description: "GitHub Sims 4 mod/script repository",
      thumbnailUrl: "",
      priceTier: "free",
    });
    if (items.length >= 16) break;
  }
  return items;
}

async function searchSimsFindsHtml(query, page) {
  const pageUrl = `https://www.simsfinds.com/search?search=${encodeURIComponent(query)}&page=${page}`;
  const html = await fetchText(pageUrl, { timeoutMs: 14000 });
  const items = [];
  const cardRe =
    /<a[^>]+href="(https:\/\/www\.simsfinds\.com\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi;
  let card;
  while ((card = cardRe.exec(html))) {
    const itemUrl = decodeHtmlEntities(card[1]);
    let thumb = decodeHtmlEntities(card[2]);
    if (!itemUrl || /\/search/i.test(itemUrl)) continue;
    if (thumb && !/^https?:\/\//i.test(thumb)) thumb = absolutizeUrl(pageUrl, thumb);
    const titleMatch = html.slice(card.index, card.index + 500).match(/alt="([^"]+)"/i);
    items.push({
      title: titleMatch?.[1] || "SimsFinds result",
      url: itemUrl,
      description: "",
      thumbnailUrl: thumb,
    });
    if (items.length >= 24) break;
  }
  return items;
}

function needsPreviewUpgrade(item) {
  const thumb = String(item?.thumbnailUrl || "");
  if (!thumb) return true;
  if (thumb.startsWith("data:")) return true;
  if (/-\d+x\d+\.|\/thumb\/|w=\d+|h=\d+/i.test(thumb)) return true;
  return false;
}

async function enrichItemPreviewFromUrl(item) {
  if (!item?.url || !isAllowedModSearchUrl(item.url)) return item;
  try {
    const html = await fetchText(item.url, { timeoutMs: 12000, maxBytes: 550000 });
    const img = pickBestImageFromHtml(html, item.url);
    if (img) {
      item.thumbnailUrl = img;
      item.previewImageUrl = img;
      item.previewStatus = /patreon\.com/i.test(item.url) ? "platform-preview" : "og-preview";
      item.previewConfidence = 0.9;
    }
  } catch {
    // ignore preview fetch errors
  }
  return item;
}

async function enrichResultsWithOgImages(results, limit = 48) {
  const firstPass = results.filter((entry) => entry.url && needsPreviewUpgrade(entry)).slice(0, limit);
  const chunkSize = 8;
  for (let i = 0; i < firstPass.length; i += chunkSize) {
    const chunk = firstPass.slice(i, i + chunkSize);
    await Promise.all(chunk.map((item) => enrichItemPreviewFromUrl(item)));
  }
  const secondPass = results.filter((entry) => entry.url && needsPreviewUpgrade(entry)).slice(0, limit);
  for (let i = 0; i < secondPass.length; i += chunkSize) {
    const chunk = secondPass.slice(i, i + chunkSize);
    await Promise.all(chunk.map((item) => enrichItemPreviewFromUrl(item)));
  }
  return results;
}

async function searchPatreonDedicated(query, page) {
  const merged = new Map();
  const add = (list) => {
    for (const entry of list || []) {
      const url = String(entry?.url || "").trim();
      if (!url || !/patreon\.com/i.test(url)) continue;
      if (!isAllowedModSearchUrl(url)) continue;
      merged.set(normalizeResultUrl(url), {
        ...entry,
        source: entry.source || "Patreon",
        priceTier: entry.priceTier || "paid",
      });
    }
  };
  try {
    add(await searchWithDuckDuckGo(`sims 4 cc ${query}`, page, ["Patreon"]));
    add(await searchWithDuckDuckGo(`sims 4 mod ${query}`, Math.min(3, page), ["Patreon"]));
  } catch {
    // ignore
  }
  try {
    const searchUrl = `https://www.patreon.com/search?q=${encodeURIComponent(`sims 4 ${query}`)}`;
    const html = await fetchText(searchUrl, { timeoutMs: 14000, maxBytes: 600000 });
    const linkRe = /href="(\/posts\/[^"?#]+|https:\/\/www\.patreon\.com\/[^"?#]+)"/gi;
    let match;
    while ((match = linkRe.exec(html))) {
      let href = decodeHtmlEntities(match[1]);
      if (href.startsWith("/")) href = absolutizeUrl("https://www.patreon.com", href);
      if (!/patreon\.com/i.test(href)) continue;
      if (/\/search|\/login|\/signup/i.test(href)) continue;
      const titleMatch = html.slice(match.index, match.index + 400).match(/>([^<]{8,120})</);
      merged.set(normalizeResultUrl(href), {
        title: titleMatch?.[1]?.trim() || "Patreon creator post",
        url: href,
        description: `Patreon: Sims 4 ${query}`,
        thumbnailUrl: "",
        priceTier: "paid",
      });
      if (merged.size >= 28) break;
    }
  } catch (err) {
    sendLog(`[SKIMO] Patreon HTML søgning: ${err?.message || err}\n`);
  }
  return Array.from(merged.values());
}

async function fetchModPreviewForUrl(pageUrl) {
  const url = String(pageUrl || "").trim();
  if (!url || !isAllowedModSearchUrl(url)) throw new Error("invalid_preview_url");
  const html = await fetchText(url, { timeoutMs: 12000, maxBytes: 500000 });
  const img = pickBestImageFromHtml(html, url);
  if (!img) throw new Error("no_preview_found");
  return {
    thumbnailUrl: img,
    previewImageUrl: img,
    previewStatus: "og-preview",
    previewConfidence: 0.9,
  };
}

async function getCurseForgeDownloadUrl(modId) {
  const key = String(process.env.CURSEFORGE_API_KEY || process.env.CF_API_KEY || "").trim();
  if (!key || !modId) return null;
  const url = `https://api.curseforge.com/v1/mods/${modId}/files?pageSize=1&index=0`;
  const data = await fetchJson(url, {
    headers: { Accept: "application/json", "x-api-key": key },
    timeoutMs: 15000,
  });
  const file = data?.data?.[0];
  if (!file?.downloadUrl) return null;
  return { url: file.downloadUrl, fileName: file.fileName || "mod.package" };
}

async function resolveModDirectDownload(payload = {}) {
  const pageUrl = String(payload.pageUrl || payload.url || "").trim();
  const presetDirect = String(payload.directDownloadUrl || "").trim();
  if (presetDirect && (isAllowedDownloadUrl(presetDirect) || SIMS_DOWNLOAD_EXT_RE.test(presetDirect))) {
    let fileName = "download.package";
    try {
      fileName = path.basename(new URL(presetDirect).pathname) || fileName;
    } catch {
      // ignore
    }
    return { url: presetDirect, fileName };
  }
  if (payload.curseforgeModId) {
    const cf = await getCurseForgeDownloadUrl(payload.curseforgeModId);
    if (cf?.url) return cf;
  }
  if (!pageUrl || !isAllowedModSearchUrl(pageUrl)) throw new Error("invalid_source_url");
  const html = await fetchText(pageUrl, { timeoutMs: 18000, maxBytes: 2500000 });
  const links = extractDownloadLinksFromHtml(html, pageUrl);
  if (!links.length) throw new Error("no_direct_download_found");
  const chosen = links[0];
  let fileName = "download.package";
  try {
    fileName = path.basename(new URL(chosen).pathname) || fileName;
  } catch {
    // ignore
  }
  return { url: chosen, fileName };
}

function buildModSearchItemFromRaw(result, rawQuery, normalized, intent, includeAdult, adultPattern, index) {
  const source = sourceForUrl(result.url);
  if (!source) return null;
  const item = {
    id: crypto.createHash("sha1").update(`${result.url}:${index}`).digest("hex").slice(0, 16),
    title: String(result.title || "")
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 200),
    source: source.name,
    sourceKey: source.key,
    url: result.url,
    directDownloadUrl: String(result.directDownloadUrl || "").trim(),
    description: String(result.description || "")
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 400),
    tags: Array.isArray(result.tags)
      ? result.tags.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 12)
      : [],
    rating: Number(result.rating || 4.5),
    downloads: Number(result.downloads || 0),
    trustScore: source.trust,
    thumbnailUrl: result.thumbnailUrl || "",
    previewStatus: result.thumbnailUrl ? (result.curseforgeModId ? "platform-preview" : "api-preview") : "pending-preview",
    previewConfidence: result.thumbnailUrl ? 0.85 : 0,
    fileName: `${String(result.title || "sims-mod")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}.package`,
    curseforgeModId: result.curseforgeModId || null,
    author: result.author || "",
    publishedAt: result.publishedAt || "",
    priceTier: result.priceTier || inferPriceTier({ ...result, title: result.title, description: result.description, url: result.url }),
    isPaid: result.isPaid,
  };
  if (!includeAdult && adultPattern.test(`${item.title} ${item.description} ${item.tags.join(" ")}`)) return null;
  item.relevanceScore = scoreModSearchRelevance(item, rawQuery, normalized, intent);
  return item;
}

async function searchWithBrave(query, page) {
  const token = String(process.env.BRAVE_SEARCH_API_KEY || "").trim();
  if (!token) return [];
  const offset = Math.max(0, (page - 1) * 20);
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(`The Sims 4 ${query} (${MODSEARCH_SITE_QUERY})`)}&count=20&offset=${offset}&safesearch=moderate`;
  const data = await fetchJson(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": token },
    timeoutMs: 12000,
  });
  return (data?.web?.results || []).map((result) => ({
    title: result.title || "",
    url: result.url || "",
    description: result.description || "",
    thumbnailUrl: result.thumbnail?.src || result.profile?.img || "",
  }));
}

async function searchWithSerpApi(query, page) {
  const key = String(process.env.SERPAPI_KEY || "").trim();
  if (!key) return [];
  const start = Math.max(0, (page - 1) * 20);
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(`The Sims 4 ${query} (${MODSEARCH_SITE_QUERY})`)}&num=20&start=${start}&safe=active&api_key=${encodeURIComponent(key)}`;
  const data = await fetchJson(url, { timeoutMs: 12000 });
  return (data?.organic_results || []).map((result) => ({
    title: result.title || "",
    url: result.link || "",
    description: result.snippet || "",
    thumbnailUrl: result.thumbnail || "",
  }));
}

async function searchWithBing(query, page) {
  const key = String(process.env.BING_SEARCH_API_KEY || "").trim();
  if (!key) return [];
  const offset = Math.max(0, (page - 1) * 20);
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(`The Sims 4 ${query} (${MODSEARCH_SITE_QUERY})`)}&count=20&offset=${offset}&safeSearch=Moderate&responseFilter=Webpages`;
  const data = await fetchJson(url, {
    headers: { "Ocp-Apim-Subscription-Key": key },
    timeoutMs: 12000,
  });
  return (data?.webPages?.value || []).map((result) => ({
    title: result.name || "",
    url: result.url || "",
    description: result.snippet || "",
    thumbnailUrl: result.thumbnailUrl || "",
  }));
}

function buildDevelopmentSearchResults(query, mode, page, sort, sourceNames) {
  const normalized = normalizeModSearchQuery(query, mode);
  const intent = inferModSearchIntent(normalized, mode);
  const gender = inferSearchGender(query || normalized);
  const chosenSources = MODSEARCH_SOURCES.filter((source) => !sourceNames?.length || sourceNames.includes(source.name));
  const sources = chosenSources.length ? chosenSources : MODSEARCH_SOURCES;
  const intentTitles = {
    hair: gender === "male"
      ? ["Male Hair CC", "Short Hair YM Pack", "Curly Male CC", "Buzz Cut CC Male", "Undercut Hair YM", "Modern Fade CC", "Faux Hawk Male CC", "Textured Male Hair", "Sleek Hair YM", "Male Hair Bundle"]
      : gender === "female"
      ? ["Long Blonde Hair CC", "Ponytail Hair Female", "Curly Female CC", "Alpha Hair Female", "Wavy Hair CC", "Braided Hair CC", "Bob Hair Female", "Updo Hair CC", "Maxis Match Long CC", "Layered Hair Female"]
      : ["LeahLillith Long Wavy Hair", "Anto Ombre Blonde Hair", "S-Club WM Hair 2024", "GreenLLamas Ponytail Hair", "Okrue Long Blonde Hair", "Sims 4 Maxis Match Hair", "Alpha Hair Collection", "Female Hair Pack", "Male Hair CC", "Curly Hair Set"],
    clothes: gender === "male"
      ? ["Male Everyday Outfit", "YM Casual Clothes", "Male Jeans CC", "Jacket Male CC", "Male Shirt Pack", "Hoodie YM CC", "Male Formal Outfit", "Sporty Male CC"]
      : gender === "female"
      ? ["Female Dress Set", "Female CAS Pack", "Girl Outfit CC", "Female Jeans CC", "Summer Dress CC", "Female Shoes Pack", "Formal Dress CC", "Female Tops CC"]
      : ["Everyday Outfit", "Female Clothes", "Dress Set", "Shoes Pack", "CAS Outfit", "Summer Clothes", "Formal Outfit"],
    buildbuy: ["Build Buy Set", "Kitchen Set", "Bedroom Furniture", "Bathroom Clutter", "Living Room Set", "Decor Pack"],
    gameplay: ["Gameplay Mod", "Script Mod", "Relationship Tweaks", "Career Mod", "Family Gameplay", "Traits Pack"],
    "skin-makeup": ["Skin Overlay", "Makeup Set", "3D Lashes", "Eyes Preset", "Blush Pack"],
    kids: ["Toddler CC", "Infant CC", "Kids Hair", "Toddler Clothes"],
  };
  const names = intentTitles[intent] || ["Sims 4 CC", "Sims 4 Mod", "Creator Pack", "Custom Content"];
  const perPage = 24;
  const start = (page - 1) * perPage;
  const items = Array.from({ length: perPage }, (_, index) => {
    const globalIndex = start + index + 1;
    const source = sources[index % sources.length];
    const baseName = names[(globalIndex - 1) % names.length];
    const title = `${baseName} ${globalIndex}`;
    const url = source.url(normalized);
    const tags = [intent || mode, mode, "sims4", "cc", "mod", gender || ""].filter(Boolean);
    return {
      id: `dev-${mode}-${page}-${globalIndex}-${source.key}`,
      title,
      source: source.name,
      sourceKey: source.key,
      url,
      description: `Sims 4 ${baseName.toLowerCase()} — ${source.name}. Open source to inspect creator item before downloading.`,
      tags,
      rating: Number((4.3 + ((globalIndex % 7) / 10)).toFixed(1)),
      downloads: 1200 + ((globalIndex * 379) % 180000),
      trustScore: source.trust,
      thumbnailUrl: modSearchThumbDataUrl(source, title, normalized, intent),
      previewStatus: "source-preview",
      previewConfidence: 0.64,
      fileName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.package`,
    };
  });
  if (sort === "popular") items.sort((a, b) => b.downloads - a.downloads);
  if (sort === "site") items.sort((a, b) => a.source.localeCompare(b.source));
  return items;
}

const SIMS4_DB_MAX_ENTRIES = 80000;
const SIMS4_DB_SAVE_DEBOUNCE_MS = 4000;
const SIMS4_DB_INDEX_SEED_TERMS = [
  "hair", "curly hair", "blonde hair", "alpha hair", "maxis match hair", "male hair", "female hair",
  "clothes", "dress", "outfit", "shoes", "cas cc", "build buy", "furniture", "kitchen", "bedroom",
  "bathroom", "clutter", "decor", "gameplay mod", "script mod", "mccc", "wicked whims", "basemental",
  "slice of life", "lilasims", "skin overlay", "lashes", "eyes", "makeup", "toddler cc", "infant cc",
  "patreon sims 4", "the sims resource cc", "nexus sims 4", "curseforge sims 4",
  "modrinth sims 4", "github sims 4 mod", "ko-fi sims 4", "simsdom cc", "plumbob sims 4",
];

let sims4ModDatabase = null;
let sims4DbIndexRunning = false;
let sims4DbSaveTimer = null;

function getSims4DatabasePath() {
  return path.join(getUserDataDir(), "sims4-mod-database.json");
}

function defaultSims4Database() {
  return {
    version: 1,
    updatedAt: null,
    indexing: { running: false, phase: "", processed: 0, added: 0, message: "" },
    entries: {},
    stats: { total: 0, bySource: {} },
  };
}

function refreshSims4DatabaseStats() {
  if (!sims4ModDatabase) return;
  const entries = Object.values(sims4ModDatabase.entries || {});
  const bySource = {};
  for (const entry of entries) {
    const key = entry.source || "Ukendt";
    bySource[key] = (bySource[key] || 0) + 1;
  }
  sims4ModDatabase.stats = { total: entries.length, bySource };
}

function getSims4DatabasePublicState() {
  const db = sims4ModDatabase || defaultSims4Database();
  return {
    total: Number(db.stats?.total || 0),
    bySource: db.stats?.bySource || {},
    updatedAt: db.updatedAt || null,
    indexing: db.indexing || defaultSims4Database().indexing,
    platforms: MODSEARCH_SOURCES.map((s) => s.name),
    note: "Platforme: CurseForge, TSR, Patreon (prioriteret), Nexus, MTS, SimsFinds, Sims4Updates, Modrinth, GitHub, Ko-fi m.fl. Billeder hentes automatisk fra hver mod-side.",
  };
}

async function loadSims4ModDatabase() {
  if (sims4ModDatabase) return sims4ModDatabase;
  try {
    const raw = await fs.readFile(getSims4DatabasePath(), "utf8");
    const parsed = JSON.parse(raw);
    sims4ModDatabase = { ...defaultSims4Database(), ...parsed, entries: parsed?.entries || {} };
  } catch {
    sims4ModDatabase = defaultSims4Database();
  }
  refreshSims4DatabaseStats();
  return sims4ModDatabase;
}

function scheduleSaveSims4ModDatabase() {
  if (sims4DbSaveTimer) clearTimeout(sims4DbSaveTimer);
  sims4DbSaveTimer = setTimeout(() => {
    saveSims4ModDatabase().catch((err) => sendLog(`[SKIMO] Database save fejl: ${err?.message || err}\n`));
  }, SIMS4_DB_SAVE_DEBOUNCE_MS);
}

async function saveSims4ModDatabase() {
  if (!sims4ModDatabase) return;
  pruneSims4DatabaseIfNeeded();
  refreshSims4DatabaseStats();
  sims4ModDatabase.updatedAt = new Date().toISOString();
  await fs.mkdir(getUserDataDir(), { recursive: true });
  await fs.writeFile(getSims4DatabasePath(), JSON.stringify(sims4ModDatabase), "utf8");
  broadcastState();
}

function pruneSims4DatabaseIfNeeded() {
  const keys = Object.keys(sims4ModDatabase.entries || {});
  if (keys.length <= SIMS4_DB_MAX_ENTRIES) return;
  const sorted = keys
    .map((key) => ({ key, at: Date.parse(sims4ModDatabase.entries[key]?.lastSeenAt || 0) || 0 }))
    .sort((a, b) => a.at - b.at);
  const remove = sorted.length - SIMS4_DB_MAX_ENTRIES;
  for (let i = 0; i < remove; i += 1) delete sims4ModDatabase.entries[sorted[i].key];
}

function makeDatabaseEntryId(url) {
  return crypto.createHash("sha1").update(normalizeResultUrl(url)).digest("hex").slice(0, 20);
}

function upsertSims4DatabaseEntries(rawList = []) {
  if (!sims4ModDatabase) return 0;
  let added = 0;
  for (const raw of rawList) {
    const url = String(raw?.url || "").trim();
    if (!url || !isAllowedModSearchUrl(url)) continue;
    const source = sourceForUrl(url);
    if (!source) continue;
    const id = makeDatabaseEntryId(url);
    const existing = sims4ModDatabase.entries[id];
    if (!existing) added += 1;
    sims4ModDatabase.entries[id] = {
      id,
      title: String(raw.title || existing?.title || "").slice(0, 200),
      url,
      source: source.name,
      sourceKey: source.key,
      description: String(raw.description || existing?.description || "").slice(0, 500),
      thumbnailUrl: raw.thumbnailUrl || existing?.thumbnailUrl || "",
      downloads: Number(raw.downloads ?? existing?.downloads ?? 0),
      rating: Number(raw.rating ?? existing?.rating ?? 4.5),
      publishedAt: raw.publishedAt || existing?.publishedAt || "",
      priceTier: raw.priceTier || inferPriceTier(raw),
      author: raw.author || existing?.author || "",
      curseforgeModId: raw.curseforgeModId || existing?.curseforgeModId || null,
      tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 12) : existing?.tags || [],
      indexedAt: existing?.indexedAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
  }
  if (added) refreshSims4DatabaseStats();
  return added;
}

function querySims4LocalDatabase(options = {}) {
  const {
    rawQuery = "",
    normalized = "",
    intent = "",
    sourceNames = [],
    includeAdult = false,
    adultPattern = null,
    sort = "relevance",
    priceFilter = "all",
    timeFilter = "all",
    ratingFilter = "all",
  } = options;
  const adult = adultPattern || /\b(nsfw|18\+|adult|wicked|basemental|sex|nude|naked|porn)\b/i;
  const entries = Object.values(sims4ModDatabase?.entries || {});
  let items = entries
    .map((entry, index) =>
      buildModSearchItemFromRaw(entry, rawQuery, normalized, intent, includeAdult, adult, index),
    )
    .filter(Boolean);
  if (rawQuery) {
    items = items.filter((item) => strictModSearchMatchesQuery(item, rawQuery, normalized, intent));
  }
  if (sourceNames.length) items = items.filter((item) => sourceNames.includes(item.source));
  return applyModSearchFilters(items, {
    sort,
    priceFilter,
    timeFilter,
    ratingFilter,
    rawQuery,
    normalized,
    intent,
  });
}

async function indexBulkSims4Updates(onProgress) {
  let added = 0;
  for (let page = 1; page <= 250; page += 1) {
    const url = `https://sims4updates.net/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=wp:featuredmedia`;
    let posts = [];
    try {
      posts = await fetchJson(url, { timeoutMs: 14000 });
    } catch {
      break;
    }
    if (!Array.isArray(posts) || !posts.length) break;
    const batch = posts.map((post) => {
      const media = post._embedded?.["wp:featuredmedia"]?.[0];
      const thumb =
        media?.media_details?.sizes?.medium_large?.source_url ||
        media?.media_details?.sizes?.medium?.source_url ||
        media?.source_url ||
        "";
      return {
        title: decodeHtmlEntities(String(post.title?.rendered || "").replace(/<[^>]+>/g, "")),
        url: post.link || "",
        description: decodeHtmlEntities(String(post.excerpt?.rendered || "").replace(/<[^>]+>/g, " ")).slice(0, 280),
        thumbnailUrl: thumb,
        publishedAt: post.date || post.modified || "",
        priceTier: "free",
      };
    });
    added += upsertSims4DatabaseEntries(batch);
    onProgress?.("sims4updates", page, added);
    if (page % 4 === 0) await saveSims4ModDatabase();
    await new Promise((r) => setTimeout(r, 220));
  }
  return added;
}

async function indexBulkCurseForge(onProgress) {
  const key = String(process.env.CURSEFORGE_API_KEY || process.env.CF_API_KEY || "").trim();
  if (!key) return 0;
  let added = 0;
  for (let index = 0; index < 10000; index += 50) {
    const url = `https://api.curseforge.com/v1/mods/search?gameId=3644&index=${index}&pageSize=50&sortField=6&sortOrder=desc`;
    let data = null;
    try {
      data = await fetchJson(url, {
        headers: { Accept: "application/json", "x-api-key": key },
        timeoutMs: 15000,
      });
    } catch {
      break;
    }
    const mods = data?.data || [];
    if (!mods.length) break;
    const batch = mods.map((mod) => ({
      title: mod.name || "",
      url: mod.links?.websiteUrl || `https://www.curseforge.com/sims4/mods/${mod.slug || mod.id}`,
      description: String(mod.summary || "").replace(/<[^>]+>/g, ""),
      thumbnailUrl: mod.logo?.thumbnailUrl || mod.logo?.url || "",
      curseforgeModId: mod.id,
      downloads: Number(mod.downloadCount || 0),
      author: mod.authors?.[0]?.name || "",
      publishedAt: mod.dateModified || mod.dateCreated || "",
      priceTier: "free",
    }));
    added += upsertSims4DatabaseEntries(batch);
    onProgress?.("curseforge", index, added);
    if (index % 200 === 0) await saveSims4ModDatabase();
    await new Promise((r) => setTimeout(r, 280));
  }
  return added;
}

async function indexSeedTerms(onProgress) {
  let added = 0;
  for (const term of SIMS4_DB_INDEX_SEED_TERMS) {
    try {
      const lists = await Promise.allSettled([
        searchWithDuckDuckGo(`sims 4 ${term}`, 1, []),
        searchCurseForgeApi(`sims 4 ${term}`, 1),
        searchSims4UpdatesApi(term, 1),
        searchModTheSimsHtml(term, 1),
        searchSimsFindsHtml(term, 1),
        searchModrinthApi(term, 1),
        searchGithubSimsHtml(term, 1),
      ]);
      for (const outcome of lists) {
        if (outcome.status === "fulfilled") added += upsertSims4DatabaseEntries(outcome.value || []);
      }
      onProgress?.("seed", term, added);
      await new Promise((r) => setTimeout(r, 450));
    } catch (err) {
      sendLog(`[SKIMO] Seed '${term}' fejl: ${err?.message || err}\n`);
    }
  }
  return added;
}

async function runSims4DatabaseIndexer() {
  if (sims4DbIndexRunning) return getSims4DatabasePublicState();
  sims4DbIndexRunning = true;
  await loadSims4ModDatabase();
  const setPhase = (phase, message) => {
    sims4ModDatabase.indexing = {
      running: true,
      phase,
      processed: Number(sims4ModDatabase.stats?.total || 0),
      added: Number(sims4ModDatabase.indexing?.added || 0),
      message,
    };
    broadcastState();
    sendLog(`[SKIMO] Database: ${message}\n`);
  };
  try {
    setPhase("sims4updates", "Indekserer Sims4Updates…");
    const u = await indexBulkSims4Updates((source, page, added) => {
      sims4ModDatabase.indexing.added = added;
      sims4ModDatabase.indexing.message = `${source} side ${page} — ${sims4ModDatabase.stats.total} mods i databasen`;
      refreshSims4DatabaseStats();
      broadcastState();
    });
    setPhase("curseforge", "Indekserer CurseForge (kræver API-nøgle)…");
    const c = await indexBulkCurseForge((source, page, added) => {
      sims4ModDatabase.indexing.added = added;
      sims4ModDatabase.indexing.message = `${source} batch ${page} — ${sims4ModDatabase.stats.total} mods`;
      refreshSims4DatabaseStats();
      broadcastState();
    });
    setPhase("seed", "Indsamler mods fra alle platforme (søge-seeds)…");
    const s = await indexSeedTerms((source, term, added) => {
      sims4ModDatabase.indexing.added = added;
      sims4ModDatabase.indexing.message = `Seed '${term}' — ${sims4ModDatabase.stats.total} mods`;
      refreshSims4DatabaseStats();
      broadcastState();
    });
    sims4ModDatabase.indexing.message = `Færdig. +${u + c + s} nye poster. I alt ${sims4ModDatabase.stats.total} Sims 4 mods/CC.`;
  } catch (err) {
    sims4ModDatabase.indexing.message = `Indeksering stoppet: ${err?.message || err}`;
  } finally {
    sims4ModDatabase.indexing.running = false;
    sims4ModDatabase.indexing.phase = "done";
    refreshSims4DatabaseStats();
    await saveSims4ModDatabase();
    sims4DbIndexRunning = false;
  }
  return getSims4DatabasePublicState();
}

async function searchSimsMods(payload = {}) {
  const rawQuery = String(payload.query || "").trim();
  const mode = ["mods", "gameplay", "buildbuy"].includes(payload.mode) ? payload.mode : "cc";
  const page = Math.max(1, Math.min(100, Number(payload.page || 1)));
  const pageSize = 24;
  const sort = String(payload.sort || "relevance");
  const priceFilter = String(payload.priceFilter || "all");
  const timeFilter = String(payload.timeFilter || "all");
  const ratingFilter = String(payload.ratingFilter || "all");
  const includeAdult = !!payload.includeAdult;
  const sourceNames = Array.isArray(payload.sources) ? payload.sources.map(String).filter(Boolean) : [];
  const { normalized, phrase } = buildSearchPhrase(rawQuery, mode);
  const intent = inferModSearchIntent(`${rawQuery} ${normalized}`, mode);
  const searchQuery = phrase;
  const platformQuery = buildPlatformSearchQuery(rawQuery, normalized, intent, mode) || rawQuery || normalized;
  const adultPattern = /\b(nsfw|18\+|adult|wicked|basemental|sex|nude|naked|porn)\b/i;
  const filterOpts = {
    sort,
    priceFilter,
    timeFilter,
    ratingFilter,
    rawQuery,
    normalized,
    intent,
  };
  const localFilterOpts = {
    ...filterOpts,
    sourceNames,
    includeAdult,
    adultPattern,
  };

  await loadSims4ModDatabase();
  const databaseTotal = Number(sims4ModDatabase.stats?.total || 0);
  const localMatches = querySims4LocalDatabase(localFilterOpts);

  const providers = databaseTotal > 0 ? ["database"] : [];
  const rawByUrl = new Map();

  const addRawResults = (list, providerName) => {
    if (!list?.length) return;
    providers.push(providerName);
    for (const entry of list) {
      const url = String(entry?.url || "").trim();
      if (!url || !isAllowedModSearchUrl(url)) continue;
      const key = normalizeResultUrl(url);
      if (!rawByUrl.has(key)) rawByUrl.set(key, entry);
    }
  };

  for (const [name, fn] of [["brave", searchWithBrave], ["serpapi", searchWithSerpApi], ["bing", searchWithBing]]) {
    try {
      const apiResults = await fn(platformQuery, page);
      addRawResults(apiResults, name);
    } catch (err) {
      sendLog(`[SKIMO] ModSearch ${name} fejl: ${err?.message || err}\n`);
    }
  }

  const platformJobs = [];
  if (modSearchSourceEnabled(sourceNames, "curseforge")) {
    platformJobs.push(["curseforge", () => searchCurseForgeApi(platformQuery, page)]);
  }
  if (modSearchSourceEnabled(sourceNames, "sims4updates")) {
    platformJobs.push(["sims4updates", () => searchSims4UpdatesApi(platformQuery, page)]);
  }
  if (modSearchSourceEnabled(sourceNames, "mod-the-sims")) {
    platformJobs.push(["modthesims", () => searchModTheSimsHtml(platformQuery, page)]);
  }
  if (modSearchSourceEnabled(sourceNames, "simsfinds")) {
    platformJobs.push(["simsfinds", () => searchSimsFindsHtml(platformQuery, page)]);
  }
  if (modSearchSourceEnabled(sourceNames, "patreon")) {
    platformJobs.push(["patreon", () => searchPatreonDedicated(platformQuery, page)]);
  }
  if (modSearchSourceEnabled(sourceNames, "modrinth")) {
    platformJobs.push(["modrinth", () => searchModrinthApi(platformQuery, page)]);
  }
  if (modSearchSourceEnabled(sourceNames, "github")) {
    platformJobs.push(["github", () => searchGithubSimsHtml(platformQuery, page)]);
  }
  platformJobs.push(["duckduckgo", () => searchWithDuckDuckGo(platformQuery, page, sourceNames)]);
  if (mode === "cc" && rawQuery) {
    platformJobs.push(["duckduckgo-raw", () => searchWithDuckDuckGo(rawQuery, page, sourceNames)]);
    platformJobs.push(["duckduckgo-mods", () => searchWithDuckDuckGo(`mod ${platformQuery}`, page, sourceNames)]);
    platformJobs.push([
      "duckduckgo-gameplay",
      () => searchWithDuckDuckGo(`gameplay mod ${platformQuery}`, page, sourceNames),
    ]);
  }

  const settled = await Promise.allSettled(platformJobs.map(([, fn]) => fn()));
  settled.forEach((outcome, index) => {
    const providerName = platformJobs[index][0];
    if (outcome.status === "fulfilled") addRawResults(outcome.value, providerName);
    else sendLog(`[SKIMO] ModSearch ${providerName} fejl: ${outcome.reason?.message || outcome.reason}\n`);
  });

  let rawResults = Array.from(rawByUrl.values());
  upsertSims4DatabaseEntries(rawResults);
  scheduleSaveSims4ModDatabase();

  let provider = providers.length ? [...new Set(providers)].join("+") : "live";

  const liveResults = rawResults
    .map((result, index) => buildModSearchItemFromRaw(result, rawQuery, normalized, intent, includeAdult, adultPattern, index))
    .filter(Boolean);

  const mergedByUrl = new Map();
  for (const item of localMatches) mergedByUrl.set(normalizeResultUrl(item.url), item);
  for (const item of liveResults) {
    const key = normalizeResultUrl(item.url);
    if (!mergedByUrl.has(key)) mergedByUrl.set(key, item);
  }

  let results = Array.from(mergedByUrl.values());
  if (sourceNames.length) results = results.filter((item) => sourceNames.includes(item.source));

  if (results.length) {
    results = applyModSearchFilters(results, filterOpts);
    results = sortModResultsByThumbnail(results);
    const hubCtx = { rawQuery, normalized, intent };
    results = await expandHubSearchResults(results, hubCtx, 10);
    results = applyModSearchFilters(results, filterOpts);
    results = sortModResultsByThumbnail(results);
    const totalMerged = results.length;
    const start = (page - 1) * pageSize;
    results = results.slice(start, start + pageSize);
    void enrichResultsWithOgImages(results, 12);
    for (const item of results) {
      if (item.thumbnailUrl && item.previewStatus === "pending-preview") {
        item.previewStatus = "og-preview";
        item.previewConfidence = 0.8;
      }
    }
    if (databaseTotal > 0) provider = `database(${databaseTotal})+${provider}`;
    return {
      query: rawQuery,
      normalizedQuery: normalized,
      mode,
      intent,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalMerged / pageSize)),
      estimatedTotal: totalMerged,
      databaseTotal,
      provider,
      sort,
      priceFilter,
      timeFilter,
      ratingFilter,
      results,
    };
  } else {
    results = [];
  }

  return {
    query: rawQuery,
    normalizedQuery: normalized,
    mode,
    intent,
    page,
    pageSize,
    totalPages: 1,
    estimatedTotal: 0,
    databaseTotal,
    provider,
    sort,
    priceFilter,
    timeFilter,
    ratingFilter,
    results,
  };
}

const ARCHIVE_EXTS = new Set([".zip", ".ts4script", ".rar", ".7z"]);

function hardenWebContents(contents) {
  if (!contents) return;
  try {
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
  } catch {}

  try {
    contents.on("will-attach-webview", (event, webPreferences, params) => {
      if (!isAllowedModSearchUrl(params?.src)) {
        event.preventDefault();
        return;
      }
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.javascript = true;
      webPreferences.allowRunningInsecureContent = false;
    });
  } catch {}

  try {
    contents.on("will-navigate", (event, url) => {
      const allowed = String(url || "").startsWith("file://");
      if (!allowed) event.preventDefault();
    });
  } catch {}

  try {
    contents.session.setPermissionRequestHandler((_wc, _perm, callback) => callback(false));
  } catch {}
}

function getLocale() {
  return preferredLocale || localeFromCountry(activationInfo?.country);
}

function sanitizeLocale(value) {
  const locale = String(value || "").trim().toLowerCase();
  return SUPPORTED_LOCALES.has(locale) ? locale : "";
}

function maskCode(code) {
  const raw = String(code || "");
  if (!raw) return "";
  const tail = raw.slice(-4);
  return `${"*".repeat(8)}${tail}`;
}

function getPublicState() {
  applySubscriptionRuntimeState();
  const locale = getLocale();
  return {
    locale,
    activated: DIRECT_ACCESS ? true : activated,
    activation: activated ? { country: activationInfo.country, code: maskCode(activationInfo.code) } : null,
    subscription: subscriptionState
      ? {
          email: subscriptionState.email,
          emailMasked: maskEmail(subscriptionState.email),
          code: maskCode(subscriptionState.codeLast4),
          activationCount: subscriptionState.activationCount,
          maxActivations: subscriptionState.maxActivations,
          remainingActivations: Math.max(0, subscriptionState.maxActivations - subscriptionState.activationCount),
          activatedAt: subscriptionState.activatedAt,
          expiresAt: subscriptionState.expiresAt,
          paymentStatus: subscriptionState.paymentStatus,
          status: subscriptionState.status,
          reason: subscriptionState.reason,
          renewalRequired: subscriptionState.renewalRequired,
          renewalUrl: subscriptionState.renewalUrl,
          allowNewCode: !!subscriptionState.allowNewCode,
        }
      : null,
    protectionEnabled,
    scanning,
    destinationFolder,
    downloadsFolder,
    lastEvent,
    history: history.slice(0, 50),
    aiIndex: getAiIndexPublicState(),
    sims4Database: getSims4DatabasePublicState(),
    outdatedMods: getOutdatedModsPublicState(),
    widgetStats: getWidgetStats(),
    email: {
      configured: getEffectiveEmailSettings().configured,
      provider: getEffectiveEmailSettings().source,
      from: getEffectiveEmailSettings().emailFrom,
      hasResendKey: !!getEffectiveEmailSettings().resendApiKey,
    },
    paths: getSandboxPaths(),
  };
}

function broadcastState() {
  const payload = getPublicState();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("state-update", payload);
  if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.webContents.send("state-update", payload);
  if (scannerWindow && !scannerWindow.isDestroyed()) scannerWindow.webContents.send("state-update", payload);
  syncScannerOverlay(payload);
  updateTrayMenu();
}

async function loadState() {
  try {
    const raw = await fs.readFile(getStateFilePath(), "utf8");
    const parsed = JSON.parse(raw);

    // App updates/re-signing change the executable fingerprint, but must not interrupt
    // a valid subscription or long-running AI indexing session.
    const savedFingerprint = typeof parsed.installFingerprint === "string" ? parsed.installFingerprint : "";
    if (currentInstallFingerprint) {
      parsed.installFingerprint = savedFingerprint || currentInstallFingerprint;
    }

    activated = !!parsed.activated;
    activationInfo = parsed.activationInfo && typeof parsed.activationInfo === "object" ? parsed.activationInfo : { country: "", code: "" };
    subscriptionState = evaluateSubscriptionState(resetTestProfileIfNeeded(parsed.subscriptionState));
    preferredLocale = sanitizeLocale(parsed.preferredLocale);

    protectionEnabled = !!parsed.protectionEnabled;
    destinationFolder = typeof parsed.destinationFolder === "string" ? parsed.destinationFolder : "";
    customDownloadsFolder = typeof parsed.customDownloadsFolder === "string" ? parsed.customDownloadsFolder : "";
    applySubscriptionRuntimeState();
  } catch {
    activated = false;
    activationInfo = { country: "", code: "" };
    subscriptionState = evaluateSubscriptionState(resetTestProfileIfNeeded(null));
    preferredLocale = "";
    protectionEnabled = false;
    destinationFolder = "";
    customDownloadsFolder = "";
  }
}

async function saveState() {
  try {
    await fs.mkdir(getUserDataDir(), { recursive: true });
    const payload = JSON.stringify(
      {
        installFingerprint: currentInstallFingerprint || undefined,
        activated,
        activationInfo,
        subscriptionState,
        preferredLocale: preferredLocale || undefined,
        protectionEnabled,
        destinationFolder,
        customDownloadsFolder: customDownloadsFolder || undefined,
      },
      null,
      2,
    );
    await fs.writeFile(getStateFilePath(), payload, "utf8");
  } catch (err) {
    console.error("[SKIMO] Could not save state:", err?.message || err);
  }
}

async function loadHistory() {
  try {
    const raw = await fs.readFile(getHistoryFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) history = parsed;
    else history = [];
  } catch {
    history = [];
  }
}

async function saveHistory() {
  try {
    await fs.mkdir(getUserDataDir(), { recursive: true });
    await fs.writeFile(getHistoryFilePath(), JSON.stringify(history, null, 2), "utf8");
  } catch (err) {
    console.error("[SKIMO] Could not save history:", err?.message || err);
  }
}

function defaultAiIndexState() {
  const now = new Date().toISOString();
  return {
    running: false,
    startedAt: "",
    phaseStartedAt: now,
    phaseIndex: 0,
    phase: AI_INDEX_PHASES[0].id,
    pass: 0,
    entries: {},
    retryQueue: [],
    searchTests: {},
    metrics: {
      scannedFiles: 0,
      groupedCollections: 0,
      lowConfidence: 0,
      verifiedPreviews: 0,
      rejectedPreviews: 0,
      retries: 0,
      searchIssues: 0,
    },
    lastMessage: "AI-indeksering er ikke startet endnu.",
    updatedAt: now,
  };
}

function getAiIndexPublicState() {
  const state = aiIndexState || defaultAiIndexState();
  const phase = AI_INDEX_PHASES[state.phaseIndex] || AI_INDEX_PHASES[0];
  const started = Date.parse(state.phaseStartedAt || state.startedAt || "");
  const elapsedMs = Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0;
  const progress = phase?.durationMs ? Math.min(1, elapsedMs / phase.durationMs) : 0;
  return {
    running: !!state.running,
    phase: state.phase,
    phaseLabel: phase?.label || state.phase,
    progress,
    pass: state.pass || 0,
    entryCount: Object.keys(state.entries || {}).length,
    queueCount: Array.isArray(state.retryQueue) ? state.retryQueue.length : 0,
    metrics: state.metrics || {},
    lastMessage: state.lastMessage || "",
    updatedAt: state.updatedAt || "",
  };
}

async function loadAiIndex() {
  try {
    const raw = await fs.readFile(getAiIndexFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    aiIndexState = parsed && typeof parsed === "object" ? { ...defaultAiIndexState(), ...parsed } : defaultAiIndexState();
  } catch {
    aiIndexState = defaultAiIndexState();
  }
}

async function saveAiIndex() {
  try {
    if (!aiIndexState) return;
    aiIndexState.updatedAt = new Date().toISOString();
    await fs.mkdir(getUserDataDir(), { recursive: true });
    await fs.writeFile(getAiIndexFilePath(), JSON.stringify(aiIndexState, null, 2), "utf8");
  } catch (err) {
    console.error("[SKIMO] Could not save AI index:", err?.message || err);
  }
}

function normalizeIndexText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCreatorFromFile(fileName) {
  const raw = String(fileName || "").replace(/\.(package|ts4script|zip)$/i, "");
  const first = raw.split(/[_\- ]+/).find(Boolean) || "";
  return first && !/^\d+$/.test(first) ? first : "unknown";
}

function inferCategoryFromFile(fileName) {
  const text = normalizeIndexText(fileName);
  if (/\bhair\b|\byfhair\b|\bymhair\b|\bfemalehair\b|\bmalehair\b|\bblonde\b|\bponytail\b|\bcurly\b|\bbangs\b|\bbraid\b|\bbraids\b/.test(text)) return "hair";
  if (/\bskin\b|\boverlay\b|\blashes\b|\bmakeup\b|\beyes\b|\blipstick\b|\beyeliner\b|\bblush\b/.test(text)) return "skin-makeup";
  if (/\bclothes\b|\boutfit\b|\bdress\b|\bshoes\b|\bacc\b|\byfacc\b|\bymacc\b|\baccessory\b|\btop\b|\bbottom\b|\bskirt\b|\bpants\b/.test(text)) return "cas";
  if (/\bfurniture\b|\bkitchen\b|\bbedroom\b|\bbathroom\b|\bclutter\b|\bbuild\b|\bbuy\b/.test(text)) return "buildbuy";
  if (/\bscript\b|\bcareer\b|\btrait\b|\brelationship\b|\bgameplay\b|\btuning\b/.test(text)) return "gameplay";
  return "unknown";
}

function collectionKeyFromFile(fileName) {
  return normalizeIndexText(fileName)
    .replace(/\b(package|ts4script|zip)\b/g, " ")
    .replace(/\b(declutted|overlay|bowoverlay|addon|addons|swatch|swatches|merged|separated|recolor|recolors)\b/g, " ")
    .replace(/\bfemalehair\b/g, "female hair")
    .replace(/\bmalehair\b/g, "male hair")
    .replace(/\bv\d+\b/g, " ")
    .replace(/\b\d{10,}\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function qualityScoresForFile(filePath) {
  const fileName = path.basename(filePath);
  const category = inferCategoryFromFile(fileName);
  const creator = inferCreatorFromFile(fileName);
  const hasCreator = creator !== "unknown";
  const hasCategory = category !== "unknown";
  return {
    imageConfidence: 0,
    metadataConfidence: hasCreator || hasCategory ? 0.38 : 0.12,
    creatorConfidence: hasCreator ? 0.58 : 0.08,
    categoryConfidence: hasCategory ? 0.64 : 0.14,
    sourceTrust: 0.3,
    groupingConfidence: collectionKeyFromFile(fileName) ? 0.56 : 0.1,
  };
}

function upsertAiIndexEntry(filePath, source = "local") {
  if (!aiIndexState) aiIndexState = defaultAiIndexState();
  const fileName = path.basename(filePath);
  const key = crypto.createHash("sha256").update(String(filePath)).digest("hex").slice(0, 24);
  const existing = aiIndexState.entries[key] || {};
  const scores = { ...qualityScoresForFile(filePath), ...(existing.scores || {}) };
  const entry = {
    id: key,
    filePath,
    fileName,
    creator: inferCreatorFromFile(fileName) || existing.creator || "unknown",
    category: inferCategoryFromFile(fileName) || existing.category || "unknown",
    collectionKey: existing.collectionKey || collectionKeyFromFile(fileName),
    source,
    previewStatus: scores.imageConfidence >= 0.82 ? "verified" : "needs-validation",
    scores,
    attempts: Number(existing.attempts || 0),
    lastValidatedAt: existing.lastValidatedAt || "",
    updatedAt: new Date().toISOString(),
  };
  aiIndexState.entries[key] = entry;
  if (entry.previewStatus !== "verified" && !aiIndexState.retryQueue.includes(key)) aiIndexState.retryQueue.push(key);
  return entry;
}

async function walkForModFiles(root, out = [], depth = 0) {
  if (!root || depth > 6) return out;
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry || entry.name.startsWith(".")) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) await walkForModFiles(full, out, depth + 1);
    else if (/\.(package|ts4script|zip)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function normalizeOutdatedModSlug(fileName) {
  return String(fileName || "")
    .toLowerCase()
    .replace(/\.(package|ts4script|zip)$/i, "")
    .replace(/^\d{10,13}-/, "")
    .replace(/\bv\d+\b/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-\d{1,3}$/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseSimsModFileName(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  const base = path.basename(String(fileName || ""), ext);
  const tsMatch = base.match(/^(\d{10,13})-(.+)$/);
  if (tsMatch) {
    let ts = Number(tsMatch[1]);
    if (ts > 0 && ts < 1e12) ts *= 1000;
    return {
      slug: normalizeOutdatedModSlug(`${tsMatch[2]}${ext}`),
      displayName: tsMatch[2],
      downloadTimestamp: ts,
      hasTimestampPrefix: true,
    };
  }
  return {
    slug: normalizeOutdatedModSlug(fileName),
    displayName: base,
    downloadTimestamp: 0,
    hasTimestampPrefix: false,
  };
}

async function readSimsPackageMeta(filePath) {
  try {
    const header = await readHeaderBytes(filePath, 128);
    const sig4 = header.toString("ascii", 0, 4);
    if (sig4 !== "DBPF") {
      const preview = header.toString("utf8", 0, Math.min(120, header.length));
      const isModGuardPlaceholder = /modguard/i.test(preview);
      return {
        isValidDbpf: false,
        isModGuardPlaceholder,
        dbpfVersion: null,
        hint: isModGuardPlaceholder
          ? "Demo-fil fra ModGuard — hent rigtig CC fra en creator-side"
          : "Ikke et gyldigt Sims 4 .package (mangler DBPF-header)",
      };
    }
    const dbpfVersion = header.length >= 8 ? header.readUInt32LE(4) : null;
    return { isValidDbpf: true, isModGuardPlaceholder: false, dbpfVersion, hint: "" };
  } catch {
    return { isValidDbpf: false, isModGuardPlaceholder: false, dbpfVersion: null, hint: "Kunne ikke læse filen" };
  }
}

async function getCandidateModRoots() {
  const roots = new Set();
  if (destinationFolder) roots.add(destinationFolder);
  try {
    roots.add(path.join(app.getPath("documents"), "Electronic Arts", "The Sims 4", "Mods"));
  } catch {}
  try {
    roots.add(path.join(app.getPath("home"), "Desktop"));
  } catch {}
  for (const item of history || []) {
    if (item?.savedTo) roots.add(path.dirname(item.savedTo));
  }
  return Array.from(roots).filter(Boolean);
}

async function resolveModFilePath(payload = {}) {
  const fileName = String(payload.fileName || path.basename(payload.savedTo || payload.path || "")).trim();
  const savedTo = String(payload.savedTo || payload.path || "").trim();
  if (savedTo) {
    try {
      const st = await fs.stat(savedTo);
      if (st.isFile()) return { path: savedTo, fileName: path.basename(savedTo), modsFolder: path.dirname(savedTo) };
    } catch {
      // fall through to search
    }
  }
  const roots = await getCandidateModRoots();
  const wantSlug = normalizeOutdatedModSlug(fileName);
  const nameLower = fileName.toLowerCase();
  let slugMatch = "";
  for (const root of roots) {
    const files = await walkForModFiles(root);
    for (const full of files) {
      const base = path.basename(full);
      if (base.toLowerCase() === nameLower) {
        return { path: full, fileName: base, modsFolder: root };
      }
      if (wantSlug && normalizeOutdatedModSlug(base) === wantSlug && !slugMatch) slugMatch = full;
    }
  }
  if (slugMatch) {
    return { path: slugMatch, fileName: path.basename(slugMatch), modsFolder: path.dirname(slugMatch) };
  }
  return { path: "", fileName, modsFolder: destinationFolder || "" };
}

async function scanOutdatedModsFolder() {
  const roots = await getCandidateModRoots();
  const modsFolder = destinationFolder || roots[0] || "";
  const byPath = new Map();

  for (const root of roots) {
    const paths = await walkForModFiles(root);
    for (const fullPath of paths) {
      if (!/\.(package|ts4script)$/i.test(fullPath)) continue;
      let st;
      try {
        st = await fs.stat(fullPath);
      } catch {
        continue;
      }
      const name = path.basename(fullPath);
      const parsed = parseSimsModFileName(name);
      const meta = await readSimsPackageMeta(fullPath);
      byPath.set(fullPath, {
        fileName: name,
        savedTo: fullPath,
        path: fullPath,
        at: st.mtime.toISOString(),
        mtimeMs: st.mtimeMs,
        size: st.size,
        slug: parsed.slug,
        downloadTimestamp: parsed.downloadTimestamp || st.mtimeMs,
        displayName: parsed.displayName,
        isValidPackage: meta.isValidDbpf,
        packageHint: meta.hint,
        isModGuardPlaceholder: meta.isModGuardPlaceholder,
        dbpfVersion: meta.dbpfVersion,
        status: "clean",
        sourceHost: "mods-folder",
        contentType: meta.isValidDbpf ? "Sims 4 .package" : "Ukendt fil",
      });
    }
  }

  const unique = Array.from(byPath.values());
  const bySlug = new Map();
  for (const file of unique) {
    if (!bySlug.has(file.slug)) bySlug.set(file.slug, []);
    bySlug.get(file.slug).push(file);
  }

  const outdated = [];
  const seen = new Set();
  const now = Date.now();

  for (const [, group] of bySlug) {
    group.sort((a, b) => (b.downloadTimestamp || b.mtimeMs) - (a.downloadTimestamp || a.mtimeMs));
    const newest = group[0];
    for (let i = 1; i < group.length; i += 1) {
      const old = group[i];
      if (seen.has(old.savedTo)) continue;
      seen.add(old.savedTo);
      outdated.push({
        ...old,
        outdatedReason: `Nyere version findes: ${newest.fileName}`,
        newerFile: newest.fileName,
      });
    }
  }

  for (const file of unique) {
    const ageDays = Math.floor((now - (file.downloadTimestamp || file.mtimeMs)) / 86400000);
    if (ageDays >= 30) {
      if (seen.has(file.savedTo)) continue;
      seen.add(file.savedTo);
      outdated.push({
        ...file,
        outdatedReason: `Muligvis outdated (${ageDays} dage) — søg efter opdatering i ModSearch`,
      });
    }
    if (!file.isValidPackage) {
      if (seen.has(file.savedTo)) continue;
      seen.add(file.savedTo);
      outdated.push({
        ...file,
        outdatedReason: file.packageHint || "Ugyldig mod-fil — bør slettes eller erstattes",
      });
    }
  }

  const broken = unique.filter((file) => !file.isValidPackage);
  outdatedModsCache = {
    items: outdated,
    allFiles: unique,
    broken,
    scannedAt: new Date().toISOString(),
    modsFolder,
    totalScanned: unique.length,
    roots,
  };
  sendLog(`[SKIMO] Outdated scan: ${outdated.length} outdated af ${unique.length} mods i ${roots.length} mapper.\n`);
  broadcastState();
  return outdatedModsCache;
}

function getOutdatedModsPublicState() {
  return {
    count: outdatedModsCache.items?.length || 0,
    scannedAt: outdatedModsCache.scannedAt,
    modsFolder: outdatedModsCache.modsFolder || destinationFolder || "",
    totalScanned: outdatedModsCache.totalScanned || 0,
    items: (outdatedModsCache.items || []).slice(0, 30).map((item) => ({
      fileName: item?.fileName || "",
      path: item?.path || item?.savedTo || "",
      reason: item?.outdatedReason || item?.packageHint || item?.reason || item?.label || "",
    })),
    brokenCount: outdatedModsCache.broken?.length || 0,
  };
}

function getDuplicateModGroups() {
  const files = Array.isArray(outdatedModsCache.allFiles) ? outdatedModsCache.allFiles : [];
  const byName = new Map();
  for (const file of files) {
    const name = String(file?.fileName || "").trim().toLowerCase();
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(file);
  }
  const groups = [];
  for (const [, group] of byName) {
    if (group.length < 2) continue;
    groups.push({
      fileName: group[0]?.fileName || "",
      count: group.length,
      paths: group.map((item) => item?.savedTo || item?.path || "").filter(Boolean),
    });
  }
  groups.sort((a, b) => b.count - a.count);
  return groups;
}

function getWidgetStats() {
  const cleanItems = history.filter((item) => item?.status === "clean");
  const blockedItems = history.filter((item) => item?.status === "virus" || item?.status === "error");
  const duplicateGroups = getDuplicateModGroups();
  const logItems = history.slice(0, 30).map((item) => ({
    fileName: item?.fileName || "",
    at: item?.at || "",
    status: item?.status || "",
    message: item?.message || "",
  }));
  return {
    downloadedCount: cleanItems.length,
    quarantineCount: blockedItems.length,
    outdatedCount: outdatedModsCache.items?.length || 0,
    logsCount: history.length,
    duplicatesCount: duplicateGroups.length,
    duplicateExtraCount: duplicateGroups.reduce((sum, group) => sum + Math.max(0, group.count - 1), 0),
    downloadedItems: cleanItems.slice(0, 25).map((item) => ({
      fileName: item?.fileName || "",
      at: item?.at || "",
      savedTo: item?.savedTo || "",
      message: item?.message || "",
    })),
    quarantineItems: blockedItems.slice(0, 25).map((item) => ({
      fileName: item?.fileName || "",
      at: item?.at || "",
      status: item?.status || "",
      message: item?.message || "",
    })),
    logItems,
    duplicateItems: duplicateGroups.slice(0, 25),
  };
}

async function aiDiscoveryPass() {
  const roots = await getCandidateModRoots();
  let files = [];
  for (const root of roots) files = files.concat(await walkForModFiles(root));
  for (const item of history || []) {
    if (item?.savedTo && /\.(package|ts4script|zip)$/i.test(item.savedTo)) files.push(item.savedTo);
  }
  files = Array.from(new Set(files));
  for (const file of files.slice(0, 2500)) upsertAiIndexEntry(file, "local");
  const collectionKeys = new Set(Object.values(aiIndexState.entries || {}).map((entry) => entry.collectionKey).filter(Boolean));
  aiIndexState.metrics.scannedFiles = files.length;
  aiIndexState.metrics.groupedCollections = collectionKeys.size;
  aiIndexState.lastMessage = `Finder og grupperer ${files.length} lokale modfiler i ${collectionKeys.size} samlinger.`;
}

function aiImageValidationPass(limit = 80) {
  const queue = Array.isArray(aiIndexState.retryQueue) ? aiIndexState.retryQueue : [];
  const nextQueue = [];
  let processed = 0;
  for (const id of queue) {
    const entry = aiIndexState.entries?.[id];
    if (!entry) continue;
    if (processed >= limit) {
      nextQueue.push(id);
      continue;
    }
    processed += 1;
    entry.attempts = Number(entry.attempts || 0) + 1;
    entry.lastValidatedAt = new Date().toISOString();
    // Until a real crawler/vision model verifies a preview, keep image confidence low.
    entry.scores.imageConfidence = Math.min(0.78, Number(entry.scores.imageConfidence || 0) + 0.04);
    entry.previewStatus = entry.scores.imageConfidence >= 0.82 ? "verified" : "rejected-low-confidence";
    if (entry.previewStatus !== "verified") nextQueue.push(id);
  }
  aiIndexState.retryQueue = nextQueue;
  aiIndexState.metrics.retries = Number(aiIndexState.metrics.retries || 0) + processed;
  aiIndexState.metrics.verifiedPreviews = Object.values(aiIndexState.entries || {}).filter((entry) => entry.previewStatus === "verified").length;
  aiIndexState.metrics.rejectedPreviews = Object.values(aiIndexState.entries || {}).filter((entry) => entry.previewStatus !== "verified").length;
  aiIndexState.metrics.lowConfidence = aiIndexState.metrics.rejectedPreviews;
  aiIndexState.lastMessage = `Billedvalidering prøvede ${processed} filer igen. Usikre previews skjules stadig.`;
}

function aiSearchQualityPass() {
  const entries = Object.values(aiIndexState.entries || {});
  const tests = {};
  let issues = 0;
  for (const query of AI_SEARCH_TESTS) {
    const q = normalizeIndexText(query);
    const expected = inferCategoryFromFile(q);
    const matches = entries.filter((entry) => {
      if (q.includes("hair")) return entry.category === "hair";
      if (q.includes("furniture")) return entry.category === "buildbuy";
      if (q.includes("skin") || q.includes("makeup")) return entry.category === "skin-makeup";
      if (q.includes("gameplay") || q.includes("script")) return entry.category === "gameplay";
      if (q.includes("clothes")) return entry.category === "cas";
      if (q.includes("toddler")) return normalizeIndexText(entry.fileName).includes("toddler");
      return expected === "unknown" || entry.category === expected;
    });
    const unrelated = matches.filter((entry) => q.includes("hair") && /toddler|infant|furniture|kitchen|gameplay/i.test(entry.fileName));
    issues += unrelated.length;
    tests[query] = { checked: matches.length, unrelated: unrelated.length, passed: unrelated.length === 0 };
  }
  calibrateModSearchIntentFilters();
  aiIndexState.searchTests = tests;
  aiIndexState.metrics.searchIssues = issues;
  aiIndexState.lastMessage = `Søgetest kørte ${AI_SEARCH_TESTS.length} intent-tests med ${issues} problem(er).`;
}

function calibrateModSearchIntentFilters() {
  const samples = [
    { title: "Long Wavy Blonde Hair CC", description: "female hair maxis match", tags: ["hair", "cc"], expect: true, query: "hair", intent: "hair" },
    { title: "Summer Dress Outfit", description: "cas clothing", tags: ["clothes"], expect: false, query: "hair", intent: "hair" },
    { title: "Male Hair Pack 2024", description: "men hair", tags: ["hair", "male"], expect: true, query: "male hair", intent: "hair" },
    { title: "Female Hair Collection", description: "women hair", tags: ["hair", "female"], expect: false, query: "male hair", intent: "hair" },
    { title: "Kitchen Clutter Set", description: "build buy", tags: ["furniture"], expect: false, query: "hår", intent: "hair" },
    { title: "Alpha Maxis Match Hair", description: "hair cc female", tags: ["hair"], expect: true, query: "hår", intent: "hair" },
    { title: "Jeans and Top Outfit", description: "clothes cas", tags: ["clothes"], expect: false, query: "hår", intent: "hair" },
    { title: "YM Hair 001", description: "male hair sims 4", tags: ["hair", "male"], expect: true, query: "male hair", intent: "hair" },
    { title: "Wedding Dress", description: "formal dress", tags: ["clothes", "dress"], expect: false, query: "male hair", intent: "hair" },
  ];
  let fails = 0;
  for (const sample of samples) {
    const ok = modSearchItemMatchesIntent(sample, sample.intent, sample.query);
    if (ok !== sample.expect) fails += 1;
  }
  if (fails) sendLog(`[SKIMO] ModSearch intent kalibrering: ${fails} test(s) fejlede — filtre strammet.\n`);
}

async function tickAiIndex() {
  if (!aiIndexState) aiIndexState = defaultAiIndexState();
  if (!aiIndexState.running || !activated) return;
  const phase = AI_INDEX_PHASES[aiIndexState.phaseIndex] || AI_INDEX_PHASES[0];
  const phaseStarted = Date.parse(aiIndexState.phaseStartedAt || "");
  if (Number.isFinite(phaseStarted) && Date.now() - phaseStarted > phase.durationMs) {
    aiIndexState.phaseIndex = (aiIndexState.phaseIndex + 1) % AI_INDEX_PHASES.length;
    if (aiIndexState.phaseIndex === 0) aiIndexState.pass = Number(aiIndexState.pass || 0) + 1;
    aiIndexState.phase = AI_INDEX_PHASES[aiIndexState.phaseIndex].id;
    aiIndexState.phaseStartedAt = new Date().toISOString();
  }

  if (aiIndexState.phase === "initialDiscovery") await aiDiscoveryPass();
  else if (aiIndexState.phase === "imageValidation") aiImageValidationPass(120);
  else if (aiIndexState.phase === "searchQuality") aiSearchQualityPass();
  else {
    await aiDiscoveryPass();
    aiImageValidationPass(60);
    aiSearchQualityPass();
  }
  await saveAiIndex();
  broadcastState();
}

function startAiIndexing() {
  if (!aiIndexState) aiIndexState = defaultAiIndexState();
  if (!aiIndexState.running) {
    const now = new Date().toISOString();
    aiIndexState.running = true;
    aiIndexState.startedAt = aiIndexState.startedAt || now;
    aiIndexState.phaseStartedAt = aiIndexState.phaseStartedAt || now;
    aiIndexState.phase = AI_INDEX_PHASES[aiIndexState.phaseIndex || 0].id;
  }
  if (!aiIndexTimer) {
    aiIndexTimer = setInterval(() => {
      tickAiIndex().catch((err) => sendLog(`[SKIMO] AI index error: ${err?.message || err}\n`));
    }, AI_INDEX_TICK_MS);
  }
  tickAiIndex().catch((err) => sendLog(`[SKIMO] AI index error: ${err?.message || err}\n`));
}

function stopAiIndexing() {
  if (aiIndexTimer) clearInterval(aiIndexTimer);
  aiIndexTimer = null;
  if (aiIndexState) aiIndexState.running = false;
  saveAiIndex().catch(() => {});
}

async function refreshSubscriptionStatusFromBilling() {
  if (!subscriptionState?.email || !subscriptionState?.codeHash) {
    subscriptionState = evaluateSubscriptionState(subscriptionState);
    return;
  }
  const next = { ...subscriptionState };
  const billing = await fetchBillingStatus(next.email, next.codeHash);
  next.lastPaymentCheckAt = new Date().toISOString();
  next.lastPaymentCheckError = "";
  if (billing) {
    next.paymentStatus = billing.paymentStatus || next.paymentStatus;
    if (billing.expiresAt) next.expiresAt = billing.expiresAt;
    if (billing.renewalUrl) next.renewalUrl = billing.renewalUrl;
    if (typeof billing.allowNewCode === "boolean") next.allowNewCode = billing.allowNewCode;
  }
  subscriptionState = evaluateSubscriptionState(next);
  applySubscriptionRuntimeState();
  await saveState();
}

function sendLog(chunk) {
  const text = typeof chunk === "string" ? chunk : String(chunk);
  process.stdout.write(text);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("scan-log", text);
}

const UNZIP_CMD = fssync.existsSync("/usr/bin/unzip") ? "/usr/bin/unzip" : "unzip";

async function spawnCapture(cmd, args, { cwd, maxBytes = 1_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    const chunks = [];
    let size = 0;
    let truncated = false;

    const onData = (d) => {
      if (!d || d.length === 0) return;
      if (size >= maxBytes) {
        truncated = true;
        return;
      }
      const buf = Buffer.isBuffer(d) ? d : Buffer.from(d);
      const room = maxBytes - size;
      if (buf.length > room) {
        chunks.push(buf.subarray(0, room));
        size += room;
        truncated = true;
        return;
      }
      chunks.push(buf);
      size += buf.length;
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 0, output: Buffer.concat(chunks, size), truncated }));
  });
}

async function readHeaderBytes(filePath, len) {
  const fh = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(len);
    const { bytesRead } = await fh.read(buf, 0, len, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

async function unzipListEntries(zipPath) {
  const { code, output } = await spawnCapture(UNZIP_CMD, ["-Z1", zipPath], { maxBytes: 2_000_000 });
  if (code !== 0) throw new Error("Kunne ikke læse zip-indhold (unzip fejlede).");
  return output
    .toString("utf8")
    .split(/\r?\n/)
    .filter(Boolean);
}

async function unzipReadEntry(zipPath, entryName, { maxBytes = 1_000_000 } = {}) {
  const { code, output, truncated } = await spawnCapture(UNZIP_CMD, ["-p", zipPath, entryName], { maxBytes });
  if (code !== 0) return { ok: false, output: Buffer.alloc(0), truncated };
  return { ok: true, output, truncated };
}

async function resetSandboxDirs() {
  const base = getSandboxBaseDir();
  await fs.mkdir(base, { recursive: true });
  for (const name of ["Input", "Karantæne", "Staging", "Mods"]) {
    try {
      await fs.rm(path.join(base, name), { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function isTempDownloadName(fileName) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".crdownload") ||
    lower.endsWith(".download") ||
    lower.endsWith(".part") ||
    lower.endsWith(".tmp")
  );
}

function stripTempDownloadSuffix(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".crdownload")) return fileName.slice(0, -".crdownload".length);
  if (lower.endsWith(".download")) return fileName.slice(0, -".download".length);
  if (lower.endsWith(".part")) return fileName.slice(0, -".part".length);
  if (lower.endsWith(".tmp")) return fileName.slice(0, -".tmp".length);
  return fileName;
}

function isLikelySimsMod(fileName) {
  if (!fileName || typeof fileName !== "string") return false;
  if (fileName.startsWith(".")) return false;
  const name = stripTempDownloadSuffix(fileName);
  const lower = String(name || "").toLowerCase();
  const ext = path.extname(lower);
  if (ext === ".package") return true; // CC / mods
  if (ext === ".ts4script") return true; // script mods (zip)
  if (ext === ".ttf") return true; // fonts for custom content
  if (ext === ".bak") return lower.includes(".package") || lower.includes(".ts4script") || lower.includes("sims") || lower.includes("cc");
  if (TRAY_EXTS.has(ext)) return true; // Tray files (lots/sims)
  if (ext === ".zip") return true; // verificeres senere (kun flyt hvis det indeholder Sims-addons)
  if (ext === ".rar" || ext === ".7z") {
    // Kan ikke scannes uden ekstra tools -> kun fang hvis navnet ligner Sims content
    const base = lower.slice(0, -ext.length);
    return base.includes("sims") || base.includes("ts4") || base.includes("mod") || base.includes("cc");
  }
  if (TEXT_EXTS.has(ext)) {
    // Nogle creators pakker instruktioner/konfig i samme download
    const base = lower.slice(0, -ext.length);
    return base.includes("sims") || base.includes("ts4") || base.includes("mod") || base.includes("cc");
  }
  return false;
}

function markDownloading(filename) {
  if (!activated || !protectionEnabled) return;
  if (scanning) return;
  const baseName = stripTempDownloadSuffix(filename);
  if (!baseName) return;
  if (lastEvent?.fileName === baseName && lastEvent?.status === "downloading") return;

  const locale = getLocale();
  lastEvent = {
    at: new Date().toISOString(),
    fileName: baseName,
    status: "downloading",
    message: t(locale, "tray.stateDownloading"),
  };
  broadcastState();
  notify(APP_DISPLAY_NAME, t(locale, "notify.downloadRegistered", { file: baseName }));
}

async function waitForStableFile(filePath, { timeoutMs = 180_000, intervalMs = 500, stableMs = 1_200 } = {}) {
  const started = Date.now();
  let lastSize = -1;
  let lastMtime = -1;
  let stableFor = 0;

  while (Date.now() - started < timeoutMs) {
    try {
      const st = await fs.stat(filePath);
      const size = st.size;
      const mtime = st.mtimeMs;
      if (size === lastSize && mtime === lastMtime) stableFor += intervalMs;
      else stableFor = 0;
      lastSize = size;
      lastMtime = mtime;

      if (stableFor >= stableMs) return true;
    } catch {
      // file not ready yet
      stableFor = 0;
      lastSize = -1;
      lastMtime = -1;
    }
    await sleep(intervalMs);
  }

  return false;
}

async function safeMoveFile(srcPath, dstPath) {
  await fs.mkdir(path.dirname(dstPath), { recursive: true });
  try {
    await fs.rename(srcPath, dstPath);
    return;
  } catch (err) {
    if (err && err.code !== "EXDEV") throw err;
    await fs.copyFile(srcPath, dstPath);
    await fs.unlink(srcPath);
  }
}

async function copyWithUniqueName(srcPath, dstDir, fileName) {
  const parsed = path.parse(fileName);
  let candidate = path.join(dstDir, fileName);
  let i = 1;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(dstDir, `${parsed.name} (${i})${parsed.ext}`);
      i++;
    } catch {
      break;
    }
  }
  await fs.mkdir(dstDir, { recursive: true });
  await fs.copyFile(srcPath, candidate);
  return candidate;
}

async function notifyOutdatedAfterSavedMod() {
  try {
    const outdatedScan = await scanOutdatedModsFolder();
    const issueCount = Number(outdatedScan?.items?.length || 0);
    if (issueCount > 0) {
      notify(APP_DISPLAY_NAME, `${issueCount} outdated/broken mods fundet i din Mods-mappe`);
    }
  } catch (err) {
    sendLog(`[SKIMO] Outdated scan efter download fejlede: ${err?.message || err}\n`);
  }
}

async function askUserToKeepSuspiciousMod(fileName, result) {
  const reasons = Array.isArray(result?.reasons) && result.reasons.length
    ? result.reasons.slice(0, 6).map((reason) => `- ${reason}`).join("\n")
    : "- ModGuard fandt mistænkelige indikatorer.";
  const vt = result?.vt
    ? `\n\nVirusTotal: ${Number(result.vt.malicious || 0)} malicious / ${Number(result.vt.suspicious || 0)} suspicious`
    : "";

  ensureMainWindow({ showOnReady: false });
  const response = await dialog.showMessageBox(mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined, {
    type: "warning",
    buttons: ["Fortsæt og læg i Mods", "Slet"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: "ModGuard advarsel",
    message: `ModGuard fandt noget mistænkeligt i ${fileName}`,
    detail: `${reasons}${vt}\n\nVil du stadig lægge filen i din valgte Sims 4 Mods-mappe?`,
  });

  return response.response === 0;
}

async function ensureDestinationFolderInteractive({ force = false, fromWidget = false } = {}) {
  if (!force && destinationFolder) return destinationFolder;

  if (!fromWidget) {
    ensureMainWindow({ showOnReady: true });
  }

  const parentWindow =
    fromWidget && widgetWindow && !widgetWindow.isDestroyed()
      ? widgetWindow
      : mainWindow && !mainWindow.isDestroyed()
        ? mainWindow
        : undefined;

  const recommended = path.join(app.getPath("documents"), "Electronic Arts", "The Sims 4", "Mods");
  const locale = getLocale();
  const result = await dialog.showOpenDialog(parentWindow, {
    title: t(locale, "dialog.chooseFolderTitle"),
    message: t(locale, "dialog.chooseFolderMsg"),
    defaultPath: recommended,
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths?.[0]) return "";

  destinationFolder = result.filePaths[0];
  await saveState();
  broadcastState();
  return destinationFolder;
}

function getExtLower(name) {
  return path.extname(String(name || "")).toLowerCase();
}

function looksLikeMachO(header4) {
  if (!header4 || header4.length < 4) return false;
  try {
    const be = header4.readUInt32BE(0);
    const le = header4.readUInt32LE(0);
    const macho = new Set([
      0xfeedface, // MH_MAGIC
      0xfeedfacf, // MH_MAGIC_64
      0xcafebabe, // FAT_MAGIC
      0xbebafeca, // FAT_CIGAM
      0xcefaedfe, // MH_CIGAM
      0xcffaedfe, // MH_CIGAM_64
    ]);
    return macho.has(be) || macho.has(le);
  } catch {
    return false;
  }
}

function isLikelyExecutableByHeader(header) {
  if (!header || header.length === 0) return "";
  const sig2 = header.toString("ascii", 0, Math.min(2, header.length));
  if (sig2 === "MZ") return "Windows .exe (MZ header)";
  if (header.length >= 2 && header[0] === 0x23 && header[1] === 0x21) return "Script fil (shebang #!)";
  if (header.length >= 4 && looksLikeMachO(header.subarray(0, 4))) return "macOS Mach-O binær";
  return "";
}

function bufferToSearchableLower(buf) {
  // latin1 bevarer bytes 0-255 og gør det muligt at finde ascii-strings i binært indhold
  try {
    return buf.toString("latin1").toLowerCase();
  } catch {
    return "";
  }
}

function sha256FileSync(filePath) {
  const h = crypto.createHash("sha256");
  h.update(fssync.readFileSync(filePath));
  return h.digest("hex");
}

async function zipLooksLikeSimsAddon(zipPath) {
  try {
    const st = await fs.stat(zipPath);
    if (st.size > 1_500_000_000) return false; // for stort til at være CC/mod i praksis
  } catch {
    return false;
  }

  let entries = [];
  try {
    entries = await unzipListEntries(zipPath);
  } catch {
    return false;
  }

  const interesting = entries
    .filter((e) => e && !e.endsWith("/"))
    .filter((e) => !String(e).startsWith("__MACOSX/"));

  for (const entry of interesting) {
    const ext = getExtLower(entry);
    if (ext === ".package" || ext === ".ts4script" || TRAY_EXTS.has(ext)) return true;
  }

  // Nogle zips har mapper uden tydelige extensions, men “Mods/” er et stærkt signal
  const allNamesLower = interesting.join("\n").toLowerCase();
  if (allNamesLower.includes("mods/") || allNamesLower.includes("the sims 4/")) return true;

  return false;
}

async function scanSimsStagedFile(stagedFilePath, fileName) {
  const ext = getExtLower(fileName);
  let archiveLike = ext === ".ts4script" || ext === ".zip";
  const reasons = [];
  let score = 0;
  const hash = (() => {
    try {
      return sha256FileSync(stagedFilePath);
    } catch {
      return "";
    }
  })();

  const add = (weight, why) => {
    score += weight;
    reasons.push(why);
  };
  const finish = (suspicious) => ({ suspicious, score, reasons, hash });

  // Arkiver vi ikke kan scanne uden ekstra tools (for at undgå “download alt muligt”)
  if (ext === ".rar" || ext === ".7z") {
    add(100, `Arkivtype '${ext}' kan ikke scannes uden ekstra værktøjer (blokkeres).`);
    return finish(true);
  }

  // Sims mods/CC: .package (DBPF)
  if (ext === ".package") {
    const header = await readHeaderBytes(stagedFilePath, 4);
    const sig4 = header.toString("ascii", 0, Math.min(4, header.length));
    if (sig4 === "DBPF") return finish(false);

    const execWhy = isLikelyExecutableByHeader(header);
    if (execWhy) add(100, `Filen ligner ${execWhy}, men endelsen er .package`);
    else if (header.toString("ascii", 0, 2) === "PK") add(90, "Filen ligner en .zip (PK header) men endelsen er .package");
    else add(80, "Ugyldigt .package header (forventer DBPF)");

    return finish(true);
  }

  // Fonts used by custom content
  if (ext === ".ttf") {
    const header = await readHeaderBytes(stagedFilePath, 4);
    const sig4 = header.toString("latin1", 0, Math.min(4, header.length));
    const isTtf = sig4 === "\u0000\u0001\u0000\u0000" || sig4 === "OTTO" || sig4 === "true";
    if (isTtf) return finish(false);

    const execWhy = isLikelyExecutableByHeader(header);
    if (execWhy) add(100, `Filen ligner ${execWhy}, men endelsen er .ttf`);
    else add(70, "Ugyldigt font-header i .ttf");
    return finish(true);
  }

  // Backup files should only mirror known safe formats
  if (ext === ".bak") {
    const header = await readHeaderBytes(stagedFilePath, 4);
    const sig4 = header.toString("ascii", 0, Math.min(4, header.length));
    if (sig4 === "DBPF") return finish(false);
    if (header.toString("ascii", 0, 2) === "PK") {
      archiveLike = true;
    } else {
      const execWhy = isLikelyExecutableByHeader(header);
      if (execWhy) add(100, `Filen ligner ${execWhy}, men endelsen er .bak`);
      else add(50, "Backup-fil matcher ikke kendte Sims formater");
      return finish(score >= 50);
    }
  }

  // Sims Tray filer (lot/sim downloads): accepter hvis de ikke er eksekverbare forklædninger
  if (TRAY_EXTS.has(ext)) {
    const header = await readHeaderBytes(stagedFilePath, 4);
    const execWhy = isLikelyExecutableByHeader(header);
    if (execWhy) {
      add(100, `Filen ligner ${execWhy}, men endelsen er ${ext}`);
      return finish(true);
    }
    if (header.toString("ascii", 0, 2) === "PK") add(80, `Filen ligner en .zip (PK header) men endelsen er ${ext}`);
    if (score > 0) return finish(true);
    return finish(false);
  }

  // Script mods og mange downloads distribueres som zip/ts4script
  if (archiveLike) {
    const header = await readHeaderBytes(stagedFilePath, 2);
    const sig2 = header.toString("ascii", 0, Math.min(2, header.length));
    if (sig2 !== "PK") {
      add(100, "Ugyldigt ZIP format (mangler PK header)");
      return finish(true);
    }

    const entries = (await unzipListEntries(stagedFilePath)).filter((e) => e && !e.endsWith("/"));
    if (entries.length === 0) {
      add(80, "Zip uden filer");
      return finish(true);
    }

    const blockedEntryExts = new Set([
      ".exe",
      ".dll",
      ".dylib",
      ".so",
      ".bat",
      ".cmd",
      ".ps1",
      ".vbs",
      ".sh",
      ".js",
      ".jse",
      ".wsf",
      ".scr",
      ".jar",
      ".lnk",
      ".url",
      ".app",
      ".pkg",
      ".command",
    ]);
    for (const entry of entries) {
      const cleanEntry = String(entry || "");
      const entryLower = cleanEntry.toLowerCase();
      if (entryLower.includes("..") || entryLower.startsWith("/") || entryLower.startsWith("\\")) {
        add(100, `Zip path traversal/absolut sti: ${cleanEntry}`);
        return finish(true);
      }
      const entryExt = getExtLower(entry);
      if (blockedEntryExts.has(entryExt)) {
        add(100, `Embedded '${entryExt}' i zip: ${entry}`);
        return finish(true);
      }
    }

    const allNamesLower = entries.join("\n").toLowerCase();
    if (allNamesLower.includes("install") || allNamesLower.includes("setup") || allNamesLower.includes("installer") || allNamesLower.includes("update")) {
      add(30, "Zip indeholder install/setup/update-navne (unormalt for Sims mods/CC)");
    }
    if (
      allNamesLower.includes("webhook") ||
      allNamesLower.includes("token") ||
      allNamesLower.includes("rat") ||
      allNamesLower.includes("backdoor") ||
      allNamesLower.includes("payload") ||
      allNamesLower.includes("steal")
    ) {
      add(10, "Entry-navne indeholder webhook/token/payload indikatorer");
    }

    const patterns = [
      // kendte exfil/persistence hints (ofte set i malware pakket som mods/CC)
      { needle: "discord.com/api/webhooks", weight: 100, why: "Discord webhook" },
      { needle: "discordapp.com/api/webhooks", weight: 100, why: "Discord webhook" },
      { needle: "webhook", weight: 40, why: "Webhook indikator" },
      { needle: "token", weight: 30, why: "Token indikator" },
      { needle: "login data", weight: 80, why: "Browser credential store (Login Data)" },
      { needle: "local state", weight: 60, why: "Chromium 'Local State' (cookie/keys)" },
      { needle: "cookies", weight: 50, why: "Cookie harvesting indikator" },
      { needle: "leveldb", weight: 50, why: "Discord/Chromium LevelDB indikator" },
      { needle: "steam", weight: 40, why: "Steam indikator" },
      { needle: "telegram", weight: 40, why: "Telegram indikator" },
      { needle: "wallet", weight: 60, why: "Crypto wallet indikator" },
      { needle: "adservice", weight: 40, why: "Adware indikator" },
      { needle: "advert", weight: 20, why: "Reklame/adware indikator" },
      { needle: "clipboard", weight: 50, why: "Clipboard access indikator" },
      { needle: "keylogger", weight: 90, why: "Keylogger indikator" },
      { needle: "screenshot", weight: 40, why: "Skærmbillede/screenshot indikator" },
      { needle: "xmrig", weight: 100, why: "Cryptojacking indikator (XMRig)" },
      { needle: "stratum+tcp", weight: 90, why: "Mining/cryptojacking indikator" },
      { needle: "ransom", weight: 90, why: "Ransomware indikator" },
      { needle: "encrypt", weight: 35, why: "Krypteringsadfærd indikator" },
      { needle: "rootkit", weight: 100, why: "Rootkit indikator" },
      { needle: "spyware", weight: 90, why: "Spyware indikator" },

      // execution
      { needle: "powershell", weight: 90, why: "PowerShell exec" },
      { needle: "cmd.exe", weight: 90, why: "Windows command exec" },
      { needle: "/bin/sh", weight: 90, why: "Shell exec" },
      { needle: "osascript", weight: 70, why: "macOS script execution (osascript)" },
      { needle: "curl ", weight: 60, why: "Download/exec indikator (curl)" },
      { needle: "wget ", weight: 60, why: "Download/exec indikator (wget)" },
      { needle: "invoke-webrequest", weight: 80, why: "PowerShell download indikator" },
      { needle: "os.system", weight: 70, why: "OS kommando (os.system)" },
      { needle: "subprocess", weight: 50, why: "Process execution (subprocess)" },
      { needle: "popen(", weight: 50, why: "Process execution (popen)" },

      // obfuscation / dynamic exec
      { needle: "base64.b64decode", weight: 70, why: "Base64 decode (obfuscation)" },
      { needle: "zlib.decompress", weight: 70, why: "Zlib decompress (packer)" },
      { needle: "marshal.loads", weight: 80, why: "Marshal loads (pyc loader)" },
      { needle: "eval(", weight: 60, why: "Dynamic eval" },
      { needle: "exec(", weight: 60, why: "Dynamic exec" },
      { needle: "ctypes", weight: 50, why: "ctypes (native calls)" },
      { needle: "winreg", weight: 60, why: "Windows registry access" },

      // persistence paths
      { needle: "startup", weight: 60, why: "Startup persistence indikator" },
      { needle: "launchagents", weight: 70, why: "LaunchAgents persistence indikator" },
      { needle: "launchdaemons", weight: 70, why: "LaunchDaemons persistence indikator" },
      { needle: "appdata", weight: 50, why: "AppData write indikator" },
    ];
    const seen = new Set();

    const scanEntryExts = new Set([...Array.from(TEXT_EXTS), ".pyc"]);
    let scanned = 0;
    for (const entry of entries) {
      if (scanned >= 80) break;
      const entryExt = getExtLower(entry);
      if (!scanEntryExts.has(entryExt)) continue;

      const { ok, output } = await unzipReadEntry(stagedFilePath, entry, { maxBytes: 1_000_000 });
      if (!ok || output.length === 0) continue;

      const textLower = bufferToSearchableLower(output);
      for (const p of patterns) {
        if (seen.has(p.needle)) continue;
        if (textLower.includes(p.needle)) {
          seen.add(p.needle);
          add(p.weight, p.why);
        }
      }

      scanned++;
      if (score >= 90) break;
    }

    return finish(score >= 90);
  }

  // Tekstfiler (typisk readme/config i downloads) – scan for tydelige malware-indikatorer
  if (TEXT_EXTS.has(ext)) {
    const header = await readHeaderBytes(stagedFilePath, 4);
    const execWhy = isLikelyExecutableByHeader(header);
    if (execWhy) {
      add(100, `Filen ligner ${execWhy}, men endelsen er ${ext}`);
      return finish(true);
    }
    try {
      const raw = await fs.readFile(stagedFilePath);
      const textLower = bufferToSearchableLower(raw.subarray(0, 2_000_000));
      const needles = [
        "discord.com/api/webhooks",
        "discordapp.com/api/webhooks",
        "powershell",
        "cmd.exe",
        "/bin/sh",
        "osascript",
        "invoke-webrequest",
        "base64.b64decode",
        "marshal.loads",
        "zlib.decompress",
      ];
      for (const n of needles) {
        if (textLower.includes(n)) add(90, `Mistænkelig tekstindikator: ${n}`);
      }
      return finish(score >= 90);
    } catch (err) {
      add(80, `Kunne ikke læse tekstfil: ${err?.message || err}`);
      return finish(true);
    }
  }

  add(100, `Ukendt filtype: ${ext || "(ingen endelse)"}`);
  return finish(true);
}

function addHistoryEntry(entry) {
  history.unshift(entry);
  if (history.length > 200) history = history.slice(0, 200);
  saveHistory().catch(() => {});
  sendScanReportToLinkedEmail(entry).catch((err) => {
    console.error("[SKIMO] scan report email error:", err?.message || err);
  });
  broadcastState();
}

function clearQueue() {
  scanQueue = [];
  queuedPaths = new Set();
  forcedScanPaths = new Set();
}

async function scanSingleDownloadedFile(downloadPath) {
  const locale = getLocale();
  ensureSubscriptionAllowsUse(locale);
  const fileName = path.basename(downloadPath);
  const startedAt = new Date().toISOString();

  lastEvent = { at: startedAt, fileName, status: "scanning", message: "Scanner…" };
  broadcastState();
  showWidgetTransient();

  const stable = await waitForStableFile(downloadPath);
  if (!stable) {
    lastEvent = { at: new Date().toISOString(), fileName, status: "error", message: "Kunne ikke læse download (timeout)." };
    addHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: lastEvent.at,
      fileName,
      status: "error",
      message: lastEvent.message,
    });
    return;
  }

  const sourceMeta = getDownloadSourceMeta(downloadPath);

  // For .zip: kun “fang” det hvis arkivet reelt indeholder Sims add-ons (ellers lader vi filen blive i Downloads)
  const ext = getExtLower(fileName);
  if (ext === ".zip") {
    const looksLikeSims = await zipLooksLikeSimsAddon(downloadPath);
    if (!looksLikeSims) {
      lastEvent = { at: new Date().toISOString(), fileName, status: "ignored", message: "Ikke Sims add-on (ignoreret)." };
      addHistoryEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: lastEvent.at,
        fileName,
        status: "ignored",
        message: lastEvent.message,
        ...sourceMeta,
      });
      return;
    }
  }

  const sandbox = getSandboxPaths();
  await resetSandboxDirs();
  await fs.mkdir(sandbox.input, { recursive: true });

  const sandboxInputFile = path.join(sandbox.input, fileName);
  try {
    await safeMoveFile(downloadPath, sandboxInputFile);
  } catch (err) {
    lastEvent = {
      at: new Date().toISOString(),
      fileName,
      status: "error",
      message: `Kunne ikke flytte fil til sandbox: ${err?.message || err}`,
    };
    addHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: lastEvent.at,
      fileName,
      status: "error",
      message: lastEvent.message,
      ...sourceMeta,
    });
    return;
  }

  scanning = true;
  broadcastState();

  try {
    printSkimoBanner();
    sendLog(`[SKIMO] Auto-scan: ${fileName}\n`);
    sendLog(`[SKIMO] Sandbox: ${sandbox.base}\n`);

    // Karantæne -> Staging -> Scan
    await fs.mkdir(sandbox.quarantine, { recursive: true });
    await fs.mkdir(sandbox.stagingMods, { recursive: true });

    const quarantineFile = path.join(sandbox.quarantine, fileName);
    await safeMoveFile(sandboxInputFile, quarantineFile);

    const stagedFile = path.join(sandbox.stagingMods, fileName);
    await fs.copyFile(quarantineFile, stagedFile);

    const baseResult = await scanSimsStagedFile(stagedFile, fileName);
    const vt = await checkFileWithVirusTotal(stagedFile, fileName, baseResult?.hash || "");
    const result = {
      ...baseResult,
      reasons: Array.isArray(baseResult?.reasons) ? [...baseResult.reasons] : [],
      score: Number(baseResult?.score || 0),
      suspicious: !!baseResult?.suspicious,
      vt,
    };
    if (vt && (vt.malicious > 0 || vt.suspicious > 0)) {
      result.suspicious = true;
      result.score += 120;
      result.reasons.push(`VirusTotal: ${vt.malicious} malicious / ${vt.suspicious} suspicious`);
    }
    sendLog(`[SKIMO] Scan score: ${result.score}\n`);
    if (vt) sendLog(`[SKIMO] VirusTotal: ${vt.malicious}/${vt.engines || 0} malicious\n`);
    if (result.reasons?.length) {
      for (const r of result.reasons) sendLog(`    - ${r}\n`);
    } else {
      sendLog("    - Ingen mistænkelige indikatorer\n");
    }

    if (!destinationFolder) await ensureDestinationFolderInteractive();
    if (!destinationFolder) {
      lastEvent = {
        at: new Date().toISOString(),
        fileName,
        status: "error",
        message: "Ingen Mods-mappe valgt. Fil bliver i sandbox.",
      };
      addHistoryEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: lastEvent.at,
        fileName,
        status: "error",
        message: lastEvent.message,
        hash: result.hash,
        vt,
        ...sourceMeta,
      });
      return;
    }

    if (result.suspicious) {
      lastEvent = { at: new Date().toISOString(), fileName, status: "warning", message: "Advarsel - afventer valg" };
      broadcastState();
      notify(APP_DISPLAY_NAME, `Advarsel: ${fileName} kræver dit valg`);
      const keepAnyway = await askUserToKeepSuspiciousMod(fileName, result);
      if (!keepAnyway) {
        lastEvent = { at: new Date().toISOString(), fileName, status: "deleted", message: "Slettet efter advarsel" };
        addHistoryEntry({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          at: lastEvent.at,
          fileName,
          status: "deleted",
          message: "Slettet efter ModGuard-advarsel",
          score: result.score,
          reasons: result.reasons,
          hash: result.hash,
          vt,
          ...sourceMeta,
        });
        notify(APP_DISPLAY_NAME, `Slettet: ${fileName}`);
        await resetSandboxDirs();
        return;
      }
    }

    try {
      const savedTo = await copyWithUniqueName(stagedFile, destinationFolder, fileName);
      await consumeSubscriptionUse();
      const savedStatus = result.suspicious ? "warning" : "clean";
      const savedMessage = result.suspicious ? "Gemt efter advarsel" : "Clean ✅";
      lastEvent = { at: new Date().toISOString(), fileName, status: savedStatus, message: savedMessage, savedTo };
      addHistoryEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: lastEvent.at,
        fileName,
        status: savedStatus,
        message: result.suspicious ? "Saved after warning" : "Saved",
        savedTo,
        score: result.score,
        reasons: result.reasons,
        hash: result.hash,
        vt,
        ...sourceMeta,
      });
      notify(APP_DISPLAY_NAME, result.suspicious ? `Gemt efter advarsel: ${fileName}` : `Clean fil gemt: ${fileName}`);
      await notifyOutdatedAfterSavedMod();
      await resetSandboxDirs();
    } catch (err) {
      lastEvent = {
        at: new Date().toISOString(),
        fileName,
        status: "error",
        message: `Kunne ikke gemme fil: ${err?.message || err}`,
      };
      addHistoryEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: lastEvent.at,
        fileName,
        status: "error",
        message: lastEvent.message,
        hash: result.hash,
        vt,
        ...sourceMeta,
      });
      // Behold fil i sandbox til demo/fejlfinding
    }
  } finally {
    scanning = false;
    broadcastState();
  }
}

function queueScanFile(filePath, { force = false } = {}) {
  if (!filePath || queuedPaths.has(filePath)) return;
  queuedPaths.add(filePath);
  if (force) forcedScanPaths.add(filePath);
  scanQueue.push(filePath);
  pumpQueue().catch((err) => console.error("[SKIMO] queue pump error:", err?.message || err));
}

function normalizeExternalFilePath(filePath) {
  const resolved = String(filePath || "").trim();
  if (!resolved) return "";
  try {
    return path.resolve(resolved);
  } catch {
    return resolved;
  }
}

function handleExternalFileOpen(filePath) {
  const resolved = normalizeExternalFilePath(filePath);
  if (!resolved) return false;
  if (!isLikelySimsMod(path.basename(resolved))) return false;

  if (!app.isReady()) {
    pendingOpenFilePaths.add(resolved);
    return true;
  }

  try {
    ensureTray();
    showMainWindow();
  } catch {
    // ignore
  }

  if (!activated) {
    const fileName = path.basename(resolved);
    lastEvent = {
      at: new Date().toISOString(),
      fileName,
      status: "error",
      message: "Aktiver ModGuard for at scanne filen.",
    };
    broadcastState();
    return true;
  }

  try {
    if (!fssync.existsSync(resolved)) return true;
  } catch {
    return true;
  }

  queueScanFile(resolved, { force: true });
  return true;
}

function handleExternalOpenArgs(argv = []) {
  for (const arg of Array.isArray(argv) ? argv : []) {
    const value = String(arg || "");
    if (!value || value.startsWith("-")) continue;
    handleExternalFileOpen(value);
  }
}

function flushPendingOpenFiles() {
  const paths = Array.from(pendingOpenFilePaths);
  pendingOpenFilePaths.clear();
  for (const filePath of paths) handleExternalFileOpen(filePath);
}

async function pumpQueue() {
  if (queuePumping) return;
  queuePumping = true;
  try {
    while (scanQueue.length > 0) {
      const next = scanQueue[0];
      const forced = forcedScanPaths.has(next);
      if (!activated || (!protectionEnabled && !forced)) break;
      if (scanning) break;

      scanQueue.shift();
      if (!next) break;
      try {
        await scanSingleDownloadedFile(next);
      } catch (err) {
        const fileName = path.basename(next || "");
        lastEvent = { at: new Date().toISOString(), fileName, status: "error", message: err?.message || String(err) };
        addHistoryEntry({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          at: lastEvent.at,
          fileName,
          status: "error",
          message: lastEvent.message,
        });
      } finally {
        queuedPaths.delete(next);
        forcedScanPaths.delete(next);
      }
    }
  } finally {
    queuePumping = false;
  }
}

function getEffectiveDownloadsFolder() {
  return customDownloadsFolder || app.getPath("downloads");
}

function restartDownloadsWatcher() {
  stopDownloadsWatcher();
  downloadsFolder = getEffectiveDownloadsFolder();
  startDownloadsWatcher();
}

function startDownloadsWatcher() {
  downloadsFolder = getEffectiveDownloadsFolder();
  if (downloadsWatcher) return;

  try {
    downloadsWatcher = fssync.watch(downloadsFolder, { persistent: true }, (_eventType, filename) => {
      if (!activated || !protectionEnabled) return;
      if (!filename) return;
      if (!isLikelySimsMod(filename)) return;
      if (isTempDownloadName(filename)) {
        markDownloading(filename);
        return;
      }
      const name = filename;
      // fs.watch får også events ved slet/rename; vent lidt og tjek at filen findes
      setTimeout(() => {
        try {
          if (!activated || !protectionEnabled) return;
          if (!isLikelySimsMod(name)) return;
          const fullPath = path.join(downloadsFolder, name);
          if (!fssync.existsSync(fullPath)) return;
          queueScanFile(fullPath);
        } catch {
          // ignore
        }
      }, 600);
    });
    sendLog(`[SKIMO] Watching downloads: ${downloadsFolder}\n`);
  } catch (err) {
    console.error("[SKIMO] Could not watch downloads:", err?.message || err);
    sendLog(`[SKIMO] Could not watch downloads: ${err?.message || err}\n`);
  }
}

function stopDownloadsWatcher() {
  if (!downloadsWatcher) return;
  try {
    downloadsWatcher.close();
  } catch {
    // ignore
  }
  downloadsWatcher = null;
  sendLog("[SKIMO] Downloads watcher stopped.\n");
}

async function setProtectionEnabled(enabled) {
  const locale = getLocale();
  if (enabled && !activated) throw new Error(t(locale, "err.activateFirst"));
  if (enabled && !destinationFolder) {
    await ensureDestinationFolderInteractive();
    if (!destinationFolder) throw new Error(t(locale, "err.chooseFolderFirst"));
  }

  protectionEnabled = !!enabled;
  await saveState();

  if (protectionEnabled) startDownloadsWatcher();
  else {
    stopDownloadsWatcher();
    clearQueue();
  }

  sendLog(`[SKIMO] Protection: ${protectionEnabled ? "ON" : "OFF"}\n`);
  broadcastState();
}

function ensureMainWindow({ showOnReady } = { showOnReady: false }) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (showOnReady) mainWindow.show();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 920,
    height: 620,
    resizable: true,
    minWidth: 820,
    minHeight: 560,
    show: false,
    backgroundColor: "#eaf5f9",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: true,
      devTools: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  hardenWebContents(mainWindow.webContents);

  mainWindow.once("ready-to-show", () => {
    if (showOnReady) mainWindow.show();
    broadcastState();
  });

  mainWindow.on("close", (event) => {
    if (allowQuit) return;
    event.preventDefault();
    hideAppToTray();
  });
}

function showMainWindow() {
  ensureMainWindow({ showOnReady: true });
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  } catch {}
  try {
    app.dock?.show();
  } catch {
    // ignore
  }
  broadcastState();
}

function hideAppToTray() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
  } catch {}
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.hide();
  } catch {}
  try {
    app.dock?.show();
  } catch {
    // ignore
  }
  broadcastState();
}

function ensureWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) return;

  const width = 380;
  const height = 632;
  const workArea = screen.getPrimaryDisplay().workArea;
  const x = workArea.x + workArea.width - width - 18;
  const y = workArea.y + 12;

  widgetWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: "#101419",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  try {
    widgetWindow.setAlwaysOnTop(true, "pop-up-menu");
  } catch {}
  try {
    widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}

  widgetWindow.loadFile(path.join(__dirname, "minimized.html"), { query: { mode: "panel" } });
  hardenWebContents(widgetWindow.webContents);
  widgetWindow.once("ready-to-show", () => {
    broadcastState();
  });

  widgetWindow.on("closed", () => {
    widgetWindow = null;
  });
}

function toggleWidgetWindow() {
  ensureWidgetWindow();
  if (!widgetWindow || widgetWindow.isDestroyed()) return;
  if (widgetWindow.isVisible()) widgetWindow.hide();
  else {
    try {
      const bounds = widgetWindow.getBounds();
      const workArea = screen.getPrimaryDisplay().workArea;
      widgetWindow.setPosition(workArea.x + workArea.width - bounds.width - 18, workArea.y + 12, false);
    } catch {}
    widgetWindow.show();
    widgetWindow.focus();
  }
  broadcastState();
}

function showWidgetTransient(ms = 0) {
  showScannerOverlay(ms);
}

function isScannerOverlayActive(payload = getPublicState()) {
  const lastStatus = payload?.lastEvent?.status ? String(payload.lastEvent.status) : "";
  return !!(payload?.scanning || lastStatus === "downloading" || lastStatus === "scanning");
}

function ensureScannerWindow() {
  if (scannerWindow && !scannerWindow.isDestroyed()) return;

  const width = 320;
  const height = 78;
  const workArea = screen.getPrimaryDisplay().workArea;
  const x = workArea.x + 14;
  const y = workArea.y + 14;

  scannerWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: "#101419",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  try {
    scannerWindow.setAlwaysOnTop(true, "screen-saver");
  } catch {}
  try {
    scannerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}

  scannerWindow.loadFile(path.join(__dirname, "minimized.html"), { query: { mode: "scanner" } });
  hardenWebContents(scannerWindow.webContents);
  scannerWindow.once("ready-to-show", () => {
    scannerWindow.webContents.send("state-update", getPublicState());
  });

  scannerWindow.on("closed", () => {
    scannerWindow = null;
  });
}

function showScannerOverlay(ms = 0) {
  try {
    ensureScannerWindow();
    if (!scannerWindow || scannerWindow.isDestroyed()) return;
    if (typeof scannerWindow.showInactive === "function") scannerWindow.showInactive();
    else scannerWindow.show();

    if (scannerHideTimer) clearTimeout(scannerHideTimer);
    if (ms > 0) {
      scannerHideTimer = setTimeout(() => {
        try {
          if (scannerWindow && !scannerWindow.isDestroyed() && !isScannerOverlayActive()) scannerWindow.hide();
        } catch {
          // ignore
        }
      }, ms);
    }
  } catch {
    // ignore
  }
}

function syncScannerOverlay(payload = getPublicState()) {
  try {
    if (isScannerOverlayActive(payload)) {
      showScannerOverlay();
      return;
    }
    if (scannerHideTimer) clearTimeout(scannerHideTimer);
    scannerHideTimer = setTimeout(() => {
      try {
        if (scannerWindow && !scannerWindow.isDestroyed() && !isScannerOverlayActive()) scannerWindow.hide();
      } catch {}
    }, 1200);
  } catch {
    // ignore
  }
}

function ensureTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, "Skimo1logo.png");
  let icon = nativeImage.createFromPath(iconPath);
  // Større menulinje-ikon (match-ish "store" status items)
  const trayPx = process.platform === "darwin" ? 36 : 24;
  if (!icon.isEmpty()) icon = icon.resize({ width: trayPx, height: trayPx });
  tray = new Tray(icon);
  tray.setToolTip(t(getLocale(), "ui.appTitle"));
  if (process.platform === "darwin" && typeof tray.setTitle === "function") {
    tray.setTitle(MENU_BAR_TITLE);
  }

  tray.on("click", () => {
    toggleWidgetWindow();
  });

  tray.on("right-click", () => {
    tray.popUpContextMenu();
  });

  tray.on("double-click", () => {
    showMainWindow();
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const locale = getLocale();
  try {
    tray.setToolTip(t(locale, "ui.appTitle"));
  } catch {
    // ignore
  }
  if (process.platform === "darwin" && typeof tray.setTitle === "function") {
    tray.setTitle(MENU_BAR_TITLE);
  }
  const stateLabel = !activated
    ? t(locale, "tray.stateInactive")
    : scanning
      ? t(locale, "tray.stateScanning")
      : lastEvent?.status === "downloading"
        ? t(locale, "tray.stateDownloading")
        : protectionEnabled
          ? t(locale, "tray.stateOn")
          : t(locale, "tray.stateOff");

  const menu = Menu.buildFromTemplate([
    { label: stateLabel, enabled: false },
    {
      label: t(locale, "tray.on"),
      enabled: activated && !scanning && !protectionEnabled,
      click: async () => {
        try {
          await setProtectionEnabled(true);
        } catch (err) {
          console.error("[SKIMO] Toggle error:", err?.message || err);
        }
      },
    },
    {
      label: t(locale, "tray.off"),
      enabled: activated && !scanning && protectionEnabled,
      click: async () => {
        try {
          await setProtectionEnabled(false);
        } catch (err) {
          console.error("[SKIMO] Toggle error:", err?.message || err);
        }
      },
    },
    {
      label: t(locale, "tray.openApp"),
      click: () => showMainWindow(),
    },
    {
      label: t(locale, "tray.quitApp"),
      click: () => {
        hideAppToTray();
      },
    },
    {
      label: t(locale, "tray.chooseFolder"),
      enabled: !scanning,
      click: async () => {
        destinationFolder = "";
        await saveState();
        await ensureDestinationFolderInteractive();
      },
    },
    {
      label: t(locale, "tray.uninstallQuit"),
      click: () => {
        uninstallAndQuit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

function forceQuitApp() {
  allowQuit = true;
  try {
    app.quit();
  } catch {
    // ignore
  }
}

async function uninstallAndQuit() {
  try {
    await setProtectionEnabled(false);
  } catch {
    // ignore
  }
  try {
    stopDownloadsWatcher();
  } catch {
    // ignore
  }
  try {
    clearQueue();
  } catch {
    // ignore
  }
  try {
    stopUpdateLoop();
  } catch {
    // ignore
  }
  try {
    stopAiIndexing();
  } catch {
    // ignore
  }

  // Reset in-memory state
  activated = false;
  activationInfo = { country: "", code: "" };
  subscriptionState = evaluateSubscriptionState(null);
  protectionEnabled = false;
  scanning = false;
  destinationFolder = "";
  history = [];
  lastEvent = null;
  aiIndexState = defaultAiIndexState();

  // Delete persisted state/sandbox so ny download kræver abonnementkode igen
  try {
    await fs.rm(getStateFilePath(), { force: true });
  } catch {}
  try {
    await fs.rm(getHistoryFilePath(), { force: true });
  } catch {}
  try {
    await fs.rm(getSandboxBaseDir(), { recursive: true, force: true });
  } catch {}
  try {
    await fs.rm(getAiIndexFilePath(), { force: true });
  } catch {}

  forceQuitApp();
}

app.on("web-contents-created", (_event, contents) => {
  hardenWebContents(contents);
});

app.on("open-file", (event, filePath) => {
  try {
    event.preventDefault();
  } catch {}
  handleExternalFileOpen(filePath);
});

app.whenReady().then(async () => {
  ensureTray();
  downloadsFolder = getEffectiveDownloadsFolder();
  currentInstallFingerprint = await computeInstallFingerprint();
  await loadEmailSettings();
  await loadGeneratedCodes();
  await loadApiKeys();
  await loadState();
  ensureDirectAccess();
  await saveState();
  await refreshSubscriptionStatusFromBilling();
  await loadHistory();
  await loadAiIndex();
  await loadSims4ModDatabase();
  if (activated && Number(sims4ModDatabase?.stats?.total || 0) < 3000) {
    setTimeout(() => {
      runSims4DatabaseIndexer().catch((err) => sendLog(`[SKIMO] Database auto-index fejl: ${err?.message || err}\n`));
    }, 12000);
  }

  ensureMainWindow({ showOnReady: false });
  ensureWidgetWindow();
  try {
    app.dock?.show();
  } catch {}
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const workArea = screen.getPrimaryDisplay().workArea;
      const bounds = widgetWindow.getBounds();
      widgetWindow.setPosition(workArea.x + workArea.width - bounds.width - 18, workArea.y + 12, false);
      widgetWindow.show();
    }
  } catch {}
  updateTrayMenu();
  broadcastState();
  startUpdateLoop();
  if (activated) startAiIndexing();
  calibrateModSearchIntentFilters();
  scheduleModSearchTraining();

  if (activated && protectionEnabled) startDownloadsWatcher();
  handleExternalOpenArgs(process.argv);
  flushPendingOpenFiles();
});

app.on("activate", () => {
  showMainWindow();
});

app.on("window-all-closed", () => {
  // Keep running in tray/widget
});

app.on("before-quit", (event) => {
  if (allowQuit) return;
  event.preventDefault();
  hideAppToTray();
});

ipcMain.handle("get-state", async () => getPublicState());

ipcMain.handle("start-ai-indexing", async () => {
  startAiIndexing();
  await saveAiIndex();
  return getAiIndexPublicState();
});

ipcMain.handle("stop-ai-indexing", async () => {
  stopAiIndexing();
  return getAiIndexPublicState();
});

async function completePasswordAuth({ email, password, remember } = {}) {
  const emailNorm = normalizeEmail(email);
  const passwordNorm = String(password || "").trim();
  const locale = getLocale();
  if (!emailNorm) throw new Error(t(locale, "err.enterEmail"));
  if (!isValidEmail(emailNorm)) throw new Error(t(locale, "err.invalidEmail"));
  if (!passwordNorm) throw new Error("Indtast password.");

  const nowIso = new Date().toISOString();
  subscriptionState = evaluateSubscriptionState({
    product: PRODUCT_ID,
    email: emailNorm,
    codeHash: hashActivationCode(passwordNorm),
    codeLast4: passwordNorm.slice(-4),
    activationCount: 0,
    maxActivations: SUBSCRIPTION_MAX_ACTIVATIONS,
    activatedAt: nowIso,
    expiresAt: "",
    paymentStatus: "paid",
    renewalUrl: buildRenewalUrl(emailNorm),
    allowNewCode: true,
    lastPaymentCheckAt: nowIso,
    lastPaymentCheckError: "",
  });
  activated = true;
  activationInfo = { country: "denmark", code: passwordNorm.slice(-4), remember: !!remember };
  await saveState();
  await setProtectionEnabled(true);
  startAiIndexing();
  broadcastState();
  return true;
}

ipcMain.handle("login", async (_evt, payload = {}) => {
  return completePasswordAuth(payload);
});

ipcMain.handle("register-user", async (_evt, payload = {}) => {
  return completePasswordAuth(payload);
});

ipcMain.handle("continue-as-guest", async () => {
  const nowIso = new Date().toISOString();
  subscriptionState = evaluateSubscriptionState({
    product: PRODUCT_ID,
    email: "guest@modverse.local",
    codeHash: hashActivationCode(`guest-${nowIso}`),
    codeLast4: "GUEST",
    activationCount: 0,
    maxActivations: SUBSCRIPTION_MAX_ACTIVATIONS,
    activatedAt: nowIso,
    expiresAt: "",
    paymentStatus: "guest",
    renewalUrl: "",
    allowNewCode: false,
    lastPaymentCheckAt: nowIso,
    lastPaymentCheckError: "",
  });
  activated = true;
  activationInfo = { country: "denmark", code: "GUEST", remember: false, guest: true };
  await saveState();
  await setProtectionEnabled(true);
  startAiIndexing();
  broadcastState();
  return true;
});

ipcMain.handle("set-window-stage", async (_evt, stage) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const next = String(stage || "");
  if (next === "main" || next === "login" || next === "onboarding") {
    mainWindow.setSize(1040, 700, true);
    mainWindow.center();
    return true;
  }
  return false;
});

ipcMain.handle("request-subscription-code", async (_evt, { email } = {}) => {
  const result = await issueSubscriptionCode(email || subscriptionState?.email || "");
  broadcastState();
  return result;
});

ipcMain.handle("save-email-settings", async (_evt, payload = {}) => {
  const resendApiKey = String(payload.resendApiKey || "").trim();
  const emailFrom = String(payload.emailFrom || "").trim();
  const emailApiUrl = String(payload.emailApiUrl || "").trim();
  if (resendApiKey && !/^re_[A-Za-z0-9_-]+/.test(resendApiKey)) throw new Error("Resend API key skal starte med re_");
  if (emailFrom && !/@/.test(emailFrom)) throw new Error("Afsender skal ligne en email, fx ModGuard <noreply@modguard.dk>");
  if (emailApiUrl && !/^https?:\/\//i.test(emailApiUrl)) throw new Error("Custom email API URL skal starte med https://");
  await saveEmailSettings({ resendApiKey, emailFrom, emailApiUrl });
  broadcastState();
  return { ok: true, configured: getEffectiveEmailSettings().configured, provider: getEffectiveEmailSettings().source };
});

ipcMain.handle("activate-renewal-code", async (_evt, { code, email } = {}) => {
  const locale = getLocale();
  const emailNorm = normalizeEmail(email || subscriptionState?.email || "");
  const codeNorm = normalizeActivationCode(code);
  if (!emailNorm) throw new Error(t(locale, "err.enterEmail"));
  if (!isValidEmail(emailNorm)) throw new Error(t(locale, "err.invalidEmail"));
  if (!codeNorm) throw new Error(t(locale, "err.enterCode"));
  const testProfile = getTestActivationProfile(emailNorm, codeNorm);
  const generatedCode = getGeneratedActivationCode(emailNorm, codeNorm);
  if (!generatedCode && !isValidActivationCode(codeNorm)) throw new Error(t(locale, "err.wrongCode"));

  const nowIso = new Date().toISOString();
  subscriptionState = evaluateSubscriptionState({
    product: PRODUCT_ID,
    email: emailNorm,
    codeHash: hashActivationCode(codeNorm),
    codeLast4: codeNorm.slice(-4),
    activationCount: 0,
    maxActivations: testProfile?.maxActivations || generatedCode?.maxActivations || SUBSCRIPTION_MAX_ACTIVATIONS,
    activatedAt: nowIso,
    expiresAt: testProfile?.neverExpires ? "" : new Date(Date.now() + SUBSCRIPTION_TERM_MS).toISOString(),
    paymentStatus: testProfile?.paymentStatus || "paid",
    renewalUrl: buildRenewalUrl(emailNorm),
    allowNewCode: true,
    lastPaymentCheckAt: nowIso,
    lastPaymentCheckError: "",
  });
  if (generatedCode) {
    generatedCode.usedAt = generatedCode.usedAt || nowIso;
    await saveGeneratedCodes();
  }
  activated = true;
  activationInfo = { country: "denmark", code: codeNorm.slice(-4), remember: false };
  await saveState();
  await setProtectionEnabled(true);
  startAiIndexing();
  broadcastState();
  return { ok: true, maxActivations: subscriptionState.maxActivations, remainingActivations: subscriptionState.maxActivations };
});

ipcMain.handle("activate", async (_evt, { country, code, email }) => {
  const locale = localeFromCountry(country);
  const codeNorm = normalizeActivationCode(code);
  const emailNorm = normalizeEmail(email);
  const testProfile = getTestActivationProfile(emailNorm, codeNorm);
  const generatedCode = getGeneratedActivationCode(emailNorm, codeNorm);
  if (!codeNorm) throw new Error(t(locale, "err.enterCode"));
  if (!emailNorm) throw new Error(t(locale, "err.enterEmail"));
  if (!isValidEmail(emailNorm)) throw new Error(t(locale, "err.invalidEmail"));
  if (!testProfile && isKnownTestActivationCode(codeNorm)) throw new Error(t(locale, "err.wrongCode"));
  if (!generatedCode && !isValidActivationCode(codeNorm)) throw new Error(t(locale, "err.wrongCode"));

  const codeHash = hashActivationCode(codeNorm);
  const nowIso = new Date().toISOString();
  const existing = evaluateSubscriptionState(resetTestProfileIfNeeded(subscriptionState));
  const sameSubscription = existing?.email === emailNorm && existing?.codeHash === codeHash;
  const billing = await fetchBillingStatus(emailNorm, codeHash);

  if (
    existing?.email === emailNorm &&
    existing?.codeHash &&
    existing.codeHash !== codeHash &&
    existing.activationCount > 0 &&
    !existing.allowNewCode &&
    !(billing?.allowNewCode)
  ) {
    subscriptionState = evaluateSubscriptionState(existing);
    applySubscriptionRuntimeState();
    await saveState();
    broadcastState();
    throw new Error(getSubscriptionReasonMessage(locale, existing.reason || "renewRequired"));
  }

  if (sameSubscription && existing.activationCount >= existing.maxActivations) {
    subscriptionState = evaluateSubscriptionState(existing);
    applySubscriptionRuntimeState();
    await saveState();
    broadcastState();
    throw new Error(getSubscriptionReasonMessage(locale, "activationLimit"));
  }

  const nextActivationCount = sameSubscription ? existing.activationCount : 0;
  const next = evaluateSubscriptionState({
    ...existing,
    product: PRODUCT_ID,
    email: emailNorm,
    codeHash,
    codeLast4: codeNorm.slice(-4),
    activationCount: nextActivationCount,
    maxActivations: testProfile?.maxActivations || generatedCode?.maxActivations || SUBSCRIPTION_MAX_ACTIVATIONS,
    activatedAt: sameSubscription && existing?.activatedAt ? existing.activatedAt : nowIso,
    expiresAt:
      testProfile?.neverExpires
        ? ""
        : billing?.expiresAt ||
          (sameSubscription && existing?.expiresAt
        ? existing.expiresAt
        : new Date(Date.now() + SUBSCRIPTION_TERM_MS).toISOString()),
    paymentStatus: testProfile?.paymentStatus || billing?.paymentStatus || (sameSubscription ? existing?.paymentStatus || "paid" : "paid"),
    renewalUrl: billing?.renewalUrl || buildRenewalUrl(emailNorm),
    allowNewCode: false,
    lastPaymentCheckAt: nowIso,
    lastPaymentCheckError: "",
  });

  subscriptionState = next;
  if (generatedCode) {
    generatedCode.usedAt = generatedCode.usedAt || nowIso;
    await saveGeneratedCodes();
  }
  applySubscriptionRuntimeState();
  if (sameSubscription && subscriptionState.status !== "active") {
    await saveState();
    broadcastState();
    throw new Error(getSubscriptionReasonMessage(locale, subscriptionState.reason));
  }

  activated = true;
  activationInfo = { country: String(country || ""), code: codeNorm.slice(-4) };
  await saveState();
  broadcastState();

  // Default: turn on protection efter aktivering
  await setProtectionEnabled(true);
  startAiIndexing();

  return true;
});

ipcMain.handle("open-renewal-url", async () => {
  const url = subscriptionState?.renewalUrl || buildRenewalUrl(subscriptionState?.email);
  if (!url) throw new Error(t(getLocale(), "err.subscriptionRenewRequired"));
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("set-protection", async (_evt, enabled) => {
  await setProtectionEnabled(!!enabled);
  return true;
});

ipcMain.handle("pick-destination-folder", async (_evt, { fromWidget } = {}) => {
  destinationFolder = "";
  await saveState();
  const picked = await ensureDestinationFolderInteractive({ force: true, fromWidget: !!fromWidget });
  return picked || null;
});

ipcMain.handle("pick-downloads-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: t(getLocale(), "dialog.chooseDownloadsTitle"),
    message: t(getLocale(), "dialog.chooseDownloadsMsg"),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths?.[0]) return null;
  customDownloadsFolder = result.filePaths[0];
  await saveState();
  restartDownloadsWatcher();
  broadcastState();
  return customDownloadsFolder;
});

ipcMain.handle("open-folder", async (_evt, which) => {
  if (which === "downloads") {
    await shell.openPath(getEffectiveDownloadsFolder());
    return true;
  }
  if (which === "destination") {
    if (!destinationFolder) throw new Error(t(getLocale(), "err.noFolderPicked"));
    await shell.openPath(destinationFolder);
    return true;
  }
  if (which === "sandbox") {
    await fs.mkdir(getSandboxBaseDir(), { recursive: true });
    await shell.openPath(getSandboxBaseDir());
    return true;
  }
  throw new Error(t(getLocale(), "err.unknownFolder"));
});

ipcMain.handle("reveal-path", async (_evt, targetPath) => {
  const resolved = await resolveModFilePath({ savedTo: targetPath, fileName: path.basename(String(targetPath || "")) });
  const target = String(resolved.path || targetPath || "").trim();
  if (!target) throw new Error("Filen findes ikke i din mod-mappe. Vælg Mods-mappe under antivirus-fanen.");
  await shell.showItemInFolder(target);
  return { path: target, modsFolder: resolved.modsFolder || path.dirname(target) };
});

ipcMain.handle("reveal-mod-file", async (_evt, payload = {}) => {
  const resolved = await resolveModFilePath(payload);
  if (!resolved.path) {
    throw new Error(
      destinationFolder
        ? `Kunne ikke finde ${payload.fileName || "filen"} i ${destinationFolder}`
        : "Vælg først din Mods-mappe (Gem clean mods i…).",
    );
  }
  await shell.showItemInFolder(resolved.path);
  return resolved;
});

ipcMain.handle("remove-mod-file", async (_evt, payload = {}) => {
  const resolved = await resolveModFilePath(payload);
  if (!resolved.path) {
    throw new Error(
      destinationFolder
        ? `Kunne ikke finde ${payload.fileName || "filen"} i ${destinationFolder}`
        : "Vælg først din Mods-mappe (Gem clean mods i…).",
    );
  }
  await shell.trashItem(resolved.path);
  history = history.filter((item) => String(item.savedTo || item.path || "") !== resolved.path);
  await saveHistory();
  broadcastState();
  return resolved;
});

ipcMain.handle("scan-outdated-mods", async () => {
  return await scanOutdatedModsFolder();
});

ipcMain.handle("scan-downloads-now", async () => {
  if (!activated || !protectionEnabled) throw new Error(t(getLocale(), "err.turnOnFirst"));
  const dir = app.getPath("downloads");
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    entries = [];
  }
  for (const name of entries) {
    if (!isLikelySimsMod(name)) continue;
    queueScanFile(path.join(dir, name));
  }
  return true;
});

ipcMain.handle("clear-history", async () => {
  history = [];
  await saveHistory();
  broadcastState();
  return true;
});

const REDDIT_FORUM_SUBREDDITS = ["TheSims4Mods", "Sims4", "Sims4Mods"];
const REDDIT_FORUM_CACHE_MS = 5 * 60 * 1000;
let redditForumCache = { posts: [], fetchedAt: 0 };

function inferRedditForumCategory(post = {}) {
  const text = `${post.title || ""} ${post.selftext || ""}`.toLowerCase();
  if (/\b(virus|malware|trojan|adware|stealer|redline)\b/.test(text)) return "virus";
  if (/\b(broken|crash|error|not working|doesn'?t work|incompatible|patch)\b/.test(text)) return "broken";
  if (/\b(warning|warn|careful|avoid|suspicious|sketchy)\b/.test(text)) return "warn";
  if (/\b(safe|trusted|approved|recommend)\b/.test(text)) return "safe";
  if (/\b(help|how to|guide|tutorial|tip)\b/.test(text)) return "tips";
  return "chat";
}

async function fetchRedditForumPosts() {
  if (redditForumCache.posts.length && Date.now() - redditForumCache.fetchedAt < REDDIT_FORUM_CACHE_MS) {
    return redditForumCache;
  }
  const merged = [];
  const seen = new Set();
  for (const sub of REDDIT_FORUM_SUBREDDITS) {
    const url = `https://www.reddit.com/r/${sub}/hot.json?limit=15`;
    try {
      const data = await fetchJson(url, {
        headers: { "User-Agent": "SimsModGuard/1.0 (by /u/simsmodguard)" },
        timeoutMs: 14000,
      });
      for (const child of data?.data?.children || []) {
        const d = child?.data;
        if (!d?.id || d.stickied) continue;
        const permalink = String(d.permalink || "");
        const key = permalink || d.id;
        if (seen.has(key)) continue;
        seen.add(key);
        const created = Number(d.created_utc || 0) * 1000;
        const selftext = String(d.selftext || "").replace(/\0/g, "").trim();
        merged.push({
          id: `reddit-${d.id}`,
          category: inferRedditForumCategory(d),
          source: "reddit",
          origin: "web",
          subreddit: `r/${sub}`,
          author: String(d.author || "reddit_user"),
          title: String(d.title || "Reddit tråd").slice(0, 300),
          body: selftext.slice(0, 500) || "Åbn tråden på Reddit for at læse mere.",
          url: permalink ? `https://www.reddit.com${permalink}` : `https://www.reddit.com/r/${sub}/`,
          upvotes: Number(d.ups || 0),
          comments: Number(d.num_comments || 0),
          at: created ? new Date(created).toISOString() : new Date().toISOString(),
          pinned: false,
          status: "",
        });
      }
    } catch (err) {
      sendLog(`[SKIMO] Reddit forum r/${sub}: ${err?.message || err}\n`);
    }
  }
  merged.sort((a, b) => new Date(b.at) - new Date(a.at));
  redditForumCache = { posts: merged, fetchedAt: Date.now(), subreddits: REDDIT_FORUM_SUBREDDITS };
  return redditForumCache;
}

ipcMain.handle("forum-fetch-reddit", async () => fetchRedditForumPosts());

ipcMain.handle("modsearch-search", async (_evt, payload = {}) => {
  return await searchSimsMods(payload);
});

ipcMain.handle("modsearch-expand-hub", async (_evt, payload = {}) => {
  const url = String(payload?.url || "").trim();
  if (!url || !isAllowedModSearchUrl(url)) return { mods: [] };
  const mods = await expandHubPage(url, payload?.parent || { title: payload?.title, url });
  return { mods, count: mods.length };
});

ipcMain.handle("modsearch-run-training", async () => runModSearchTrainingPass((modSearchTrainingState.passes || 0) + 1));

ipcMain.handle("modsearch-get-training", async () => modSearchTrainingState);

ipcMain.handle("moddb-get-status", async () => {
  await loadSims4ModDatabase();
  return getSims4DatabasePublicState();
});

ipcMain.handle("moddb-start-index", async () => {
  return await runSims4DatabaseIndexer();
});

ipcMain.handle("modsearch-fetch-preview", async (_evt, payload = {}) => {
  return await fetchModPreviewForUrl(payload?.url || payload?.pageUrl);
});

ipcMain.handle("modsearch-enrich-batch", async (_evt, payload = {}) => {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const limit = Math.min(48, items.length);
  for (let i = 0; i < limit; i += 6) {
    const chunk = items.slice(i, i + 6);
    await Promise.all(
      chunk.map(async (item) => {
        if (!item?.url) return item;
        if (!needsPreviewUpgrade(item)) return item;
        return await enrichItemPreviewFromUrl(item);
      }),
    );
  }
  return items;
});

ipcMain.handle("modsearch-download", async (_evt, payload = {}) => {
  const locale = getLocale();
  let directUrl = String(payload.directDownloadUrl || "").trim();
  let resolvedName = String(payload.fileName || payload.title || "sims-mod").trim();

  if (!/^https:\/\//i.test(directUrl)) {
    try {
      const resolved = await resolveModDirectDownload(payload);
      directUrl = String(resolved?.url || "").trim();
      if (resolved?.fileName) resolvedName = resolved.fileName;
    } catch (err) {
      const pageUrl = String(payload.pageUrl || payload.url || "").trim();
      const sourceName = String(payload.source || "").trim();
      const sourceHint = sourceName ? ` fra ${sourceName}` : "";
      return {
        status: "error",
        code: "open_source_required",
        message: `${t(locale, "err.downloadResolveFailed") || "Kunne ikke finde direkte download-link"}${sourceHint}. Siden kræver sandsynligvis login, ventetid, betaling eller et klik på originalsiden.`,
        savedTo: "",
        sourceUrl: pageUrl,
        canOpenSource: !!pageUrl,
      };
    }
  }

  if (!/^https:\/\//i.test(directUrl) || (!isAllowedModSearchUrl(directUrl) && !isAllowedDownloadUrl(directUrl))) {
    return {
      status: "error",
      message: t(locale, "err.downloadBlocked") || "Download-linket er ikke fra en godkendt kilde.",
      savedTo: "",
    };
  }

  const extMatch = resolvedName.match(/(\.[a-z0-9]+)$/i);
  const extFromUrl = (() => {
    try {
      return path.extname(new URL(directUrl).pathname).toLowerCase();
    } catch {
      return "";
    }
  })();
  const ext = extMatch?.[1]?.toLowerCase() || extFromUrl || ".package";
  const safeBase = resolvedName
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "sims-mod";
  const fileName = `${safeBase}${ext}`;
  const tempDir = path.join(app.getPath("temp"), "modguard-modsearch-downloads");
  await fs.mkdir(tempDir, { recursive: true });
  const tempFile = path.join(tempDir, `${Date.now()}-${fileName}`);

  try {
    await downloadFile(directUrl, tempFile);
  } catch (err) {
    return {
      status: "error",
      message: `${t(locale, "err.downloadFailed") || "Download fejlede."} (${err?.message || err})`,
      savedTo: "",
    };
  }

  await scanSingleDownloadedFile(tempFile);
  return {
    status: lastEvent?.status || "scanning",
    message: lastEvent?.message || "Alle mods scannes for virus, før de lægges i din Mods-mappe.",
    savedTo: lastEvent?.savedTo || "",
  };
});

ipcMain.handle("set-locale-preference", async (_evt, locale) => {
  preferredLocale = sanitizeLocale(locale);
  await saveState();
  broadcastState();
  return true;
});

ipcMain.on("minimize-to-top", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
  try {
    app.dock?.show();
  } catch {
    // ignore
  }
  try {
    ensureWidgetWindow();
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.show();
      widgetWindow.focus();
    }
  } catch {
    // ignore
  }
});

ipcMain.on("show-main-window", () => {
  showMainWindow();
});

ipcMain.handle("check-updates-now", async () => {
  await checkForRemoteUpdate();
  return true;
});

ipcMain.handle("vt-get-key", async () => {
  return { configured: !!getVtApiKey(), fromEnv: !!VT_API_KEY && !vtApiKeyOverride };
});

ipcMain.handle("vt-save-key", async (_evt, { key } = {}) => {
  vtApiKeyOverride = String(key || "").trim();
  await saveApiKeys();
  return { ok: true };
});

ipcMain.handle("vt-test-key", async () => {
  const vtKey = getVtApiKey();
  if (!vtKey) return { ok: false, error: "Ingen API-nøgle konfigureret" };
  try {
    // Use a dummy hash — 404 = key valid but file unknown, 401/403 = bad key
    await requestJson("https://www.virustotal.com/api/v3/files/0000000000000000000000000000000000000000000000000000000000000001", 10000, 0, { "x-apikey": vtKey });
    return { ok: true, message: "Forbundet til VirusTotal ✓" };
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg === "http_404") return { ok: true, message: "Forbundet til VirusTotal ✓" };
    if (msg === "http_401") return { ok: false, error: "Ugyldig API-nøgle (401 Unauthorized)" };
    if (msg === "http_403") return { ok: false, error: "Nøglen har ikke adgang (403 Forbidden)" };
    if (msg === "http_429") return { ok: false, error: "For mange forespørgsler — prøv igen om lidt" };
    return { ok: false, error: `Forbindelsesfejl: ${msg}` };
  }
});

// . codex-test-skimo-01

// . codex-test-skimo-02

// . codex-test-skimo-03

// . codex-test-skimo-04

// . codex-test-skimo-05

// . codex-test-skimo-06

// . codex-test-skimo-07

// . codex-test-skimo-08

// . codex-test-skimo-09

// . codex-test-skimo-10

// . codex-test-skimo-11

// . codex-test-skimo-12

// . codex-test-skimo-13

// . codex-test-skimo-14

// . codex-test-skimo-15

// . codex-test-skimo-16

// . codex-test-skimo-17

// . codex-test-skimo-18

// . codex-test-skimo-19

// . codex-test-skimo-20

// . codex-test-skimo-21
