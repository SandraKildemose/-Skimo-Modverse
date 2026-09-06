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
const os = require("os");
const { localeFromCountry, t } = require("./i18n");

let cachedPackageJson = null;
function readPackageJson() {
  if (cachedPackageJson) return cachedPackageJson;
  try {
    cachedPackageJson = require("./package.json");
  } catch {
    cachedPackageJson = {};
  }
  return cachedPackageJson;
}

function getAppReleaseInfo() {
  const pkg = readPackageJson();
  const fromElectron = String(app.getVersion?.() || "").trim();
  const fromPkg = String(pkg.version || "").trim();
  const appVersion = fromElectron || fromPkg;
  const appBuildId = String(pkg.buildId || "").trim();
  return { appVersion, appBuildId };
}

const APP_DISPLAY_NAME = "Minecraft Modverse";
const MENU_BAR_TITLE = " Minecraft";
try {
  app.setName(APP_DISPLAY_NAME);
} catch {}

// Sørg for at appen kun kan køre én gang (ingen dobbelt menulinje-ikoner)
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  try {
    app.quit();
  } catch {}
} else {
  app.on("second-instance", () => {
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
  });
}

let tray = null;
let mainWindow = null;
let widgetWindow = null;
let widgetHideTimer = null;

let allowQuit = false;
let preferredLocale = "";

let activated = false;
let activationInfo = { country: "", code: "" };
let subscriptionState = null;

let protectionEnabled = false;
let scanning = false;

let destinationFolder = "";
let downloadsFolder = "";

let downloadsWatcher = null;
let scanQueue = [];
let queuedPaths = new Set();
let queuePumping = false;

let history = [];
let lastEvent = null;

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
const UPDATE_PRODUCT_KEY = "modguard";
const UPDATE_FETCH_TIMEOUT_MS = 12000;
const UPDATE_DOWNLOAD_TIMEOUT_MS = 8 * 60 * 1000;
const UPDATE_CHECK_INTERVAL_MS = Math.max(5 * 60 * 1000, Number(process.env.SKIMO_UPDATE_INTERVAL_MS || 60 * 60 * 1000));
const UPDATE_MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/** Kun VirusTotal Public API (v3). Se https://docs.virustotal.com/reference/public-vs-premium-api — max 4 req/min. */
const VT_PUBLIC_API_MIN_INTERVAL_MS = Math.max(
  15_000,
  Number(process.env.SKIMO_VT_MIN_INTERVAL_MS || 16_000) || 16_000,
);
let vtPublicApiNextAllowedAt = 0;
const VT_PUBLIC_UPLOAD_MAX_BYTES = Math.max(
  1_000_000,
  Math.min(32 * 1024 * 1024, Number(process.env.SKIMO_VT_PUBLIC_UPLOAD_MAX_BYTES || 32 * 1024 * 1024) || 32 * 1024 * 1024),
);
const VT_PUBLIC_ANALYSIS_POLLS = Math.max(2, Math.min(8, Number(process.env.SKIMO_VT_PUBLIC_ANALYSIS_POLLS || 5) || 5));

async function throttleVirusTotalPublicApi() {
  const now = Date.now();
  if (now < vtPublicApiNextAllowedAt) {
    await sleep(vtPublicApiNextAllowedAt - now);
  }
  vtPublicApiNextAllowedAt = Date.now() + VT_PUBLIC_API_MIN_INTERVAL_MS;
}

function getVtApiKey() {
  const env = String(process.env.SKIMO_VT_API_KEY || "").trim();
  if (env) return env;
  try {
    const keyFile = path.join(process.resourcesPath || "", "skimo_vt_api_key.txt");
    if (!keyFile || !fssync.existsSync(keyFile)) return "";
    return String(fssync.readFileSync(keyFile, "utf8") || "")
      .split(/\r?\n/)[0]
      .trim();
  } catch {
    return "";
  }
}
const PRODUCT_ID = "minecraft";
const SUBSCRIPTION_MAX_ACTIVATIONS = Math.max(1, Number(process.env.SKIMO_SUBSCRIPTION_MAX_ACTIVATIONS || 10));
const SUBSCRIPTION_TERM_MS = Math.max(24 * 60 * 60 * 1000, Number(process.env.SKIMO_SUBSCRIPTION_TERM_MS || 365 * 24 * 60 * 60 * 1000));
const BILLING_STATUS_URL = String(process.env.SKIMO_BILLING_STATUS_URL || "").trim();
const RENEWAL_URL = String(process.env.SKIMO_RENEWAL_URL || "https://www.modguard.dk/forny").trim();
/** Max antal mods i historik (UI + gemning). */
const MAX_HISTORY_MODS = 400;
/** Heuristisk blokering: høj tærskel, så enkeltstående legitime mod-adfærd ikke giver false positive. */
const SCAN_BLOCK_SCORE_THRESHOLD = (() => {
  const parsed = Number.parseInt(String(process.env.SKIMO_SCAN_BLOCK_SCORE || "180").trim(), 10);
  const n = Number.isFinite(parsed) ? parsed : 180;
  return Math.max(120, Math.min(400, n));
})();
/** VirusTotal: kræv flere “malicious” motorer før automatisk blokering (reducerer falske positiver). */
const VT_MALICIOUS_BLOCK_MIN = (() => {
  const parsed = Number.parseInt(String(process.env.SKIMO_VT_MALICIOUS_MIN || "4").trim(), 10);
  const n = Number.isFinite(parsed) ? parsed : 4;
  return Math.max(2, Math.min(12, n));
})();
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

/** Til batch-scan af .jar i Mods: brug macOS-metadata (som ved download), ellers ukendt kilde. */
function buildBatchScanSourceMeta(sourcePath) {
  const base = { source: "batch_folder", sourcePath };
  try {
    const fromDisk = getDownloadSourceMeta(sourcePath);
    if (fromDisk.sourceHost) return { ...base, ...fromDisk };
  } catch {
    // ignore
  }
  return base;
}

function isValidActivationCode(value) {
  if (!isComplexActivationCode(value)) return false;
  if (TEST_ACTIVATION_PROFILES.some((profile) => normalizeActivationCode(profile.code) === normalizeActivationCode(value))) return true;
  return VALID_CODE_HASHES.has(hashActivationCode(value));
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

function applySubscriptionRuntimeState() {
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

function parseVirusTotalFileAttributes(attrs, source = "report") {
  const stats = attrs?.last_analysis_stats || {};
  const engines = Object.values(stats).reduce((sum, value) => sum + (Number(value) || 0), 0);
  return {
    malicious: Number(stats.malicious || 0),
    suspicious: Number(stats.suspicious || 0),
    harmless: Number(stats.harmless || 0),
    undetected: Number(stats.undetected || 0),
    timeout: Number(stats.timeout || 0),
    engines,
    source,
    reputation: Number(attrs?.reputation || 0),
    threatLabel: String(attrs?.popular_threat_classification?.suggested_threat_label || "").trim(),
  };
}

async function fetchVirusTotalReportBySha256(sha256) {
  const hash = String(sha256 || "").trim().toLowerCase();
  const vtKey = getVtApiKey();
  if (!vtKey || !/^[a-f0-9]{64}$/.test(hash)) return null;
  try {
    await throttleVirusTotalPublicApi();
    // Public API: GET /files/{id} — hash er file_id for kendte filer (ingen Premium-endpoints).
    const payload = await requestJson(`https://www.virustotal.com/api/v3/files/${hash}`, 7000, 0, { "x-apikey": vtKey });
    const attrs = payload?.data?.attributes || {};
    return parseVirusTotalFileAttributes(attrs, "hash_report");
  } catch {
    return null;
  }
}

function uploadFileToVirusTotalPublicApi(filePath, fileName, timeoutMs = 45_000) {
  const vtKey = getVtApiKey();
  if (!vtKey) return Promise.resolve(null);
  return new Promise((resolve) => {
    let st;
    try {
      st = fssync.statSync(filePath);
    } catch {
      resolve(null);
      return;
    }
    if (!st.isFile() || st.size <= 0 || st.size > VT_PUBLIC_UPLOAD_MAX_BYTES) {
      resolve(null);
      return;
    }

    const boundary = `----modguard-vt-${crypto.randomBytes(12).toString("hex")}`;
    const pre = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${String(fileName || "mod.jar").replace(/"/g, "")}"\r\nContent-Type: application/java-archive\r\n\r\n`,
      "utf8",
    );
    const post = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
    const req = https.request(
      "https://www.virustotal.com/api/v3/files",
      {
        method: "POST",
        headers: {
          "x-apikey": vtKey,
          "User-Agent": `${APP_DISPLAY_NAME}/${app.getVersion?.() || "0.0.0"}`,
          Accept: "application/json",
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": pre.length + st.size + post.length,
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
          if (raw.length > 1_000_000) req.destroy(new Error("vt_upload_response_too_large"));
        });
        res.on("end", () => {
          try {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              resolve(null);
              return;
            }
            resolve(JSON.parse(raw));
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("vt_upload_timeout")));
    req.on("error", () => resolve(null));
    req.write(pre);
    fssync.createReadStream(filePath)
      .on("error", () => {
        try {
          req.destroy(new Error("read_failed"));
        } catch {}
        resolve(null);
      })
      .on("end", () => req.end(post))
      .pipe(req, { end: false });
  });
}

async function pollVirusTotalAnalysis(analysisId) {
  const id = String(analysisId || "").trim();
  const vtKey = getVtApiKey();
  if (!id || !vtKey) return null;
  for (let i = 0; i < VT_PUBLIC_ANALYSIS_POLLS; i++) {
    await sleep(i === 0 ? VT_PUBLIC_API_MIN_INTERVAL_MS : VT_PUBLIC_API_MIN_INTERVAL_MS);
    try {
      await throttleVirusTotalPublicApi();
      const payload = await requestJson(`https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(id)}`, 15_000, 0, {
        "x-apikey": vtKey,
      });
      const attrs = payload?.data?.attributes || {};
      const status = String(attrs.status || "").toLowerCase();
      if (status === "completed") return parseVirusTotalFileAttributes(attrs, "uploaded_analysis");
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchVirusTotalVerdictForFile(sha256, filePath, fileName) {
  const byHash = await fetchVirusTotalReportBySha256(sha256);
  if (byHash) return byHash;
  if (!getVtApiKey()) return null;
  try {
    const st = await fs.stat(filePath);
    if (st.size > VT_PUBLIC_UPLOAD_MAX_BYTES) return null;
  } catch {
    return null;
  }
  sendLog("[SKIMO] VirusTotal: hash ikke kendt — uploader til public API og venter på analyse.\n");
  await throttleVirusTotalPublicApi();
  const uploaded = await uploadFileToVirusTotalPublicApi(filePath, fileName);
  const id = String(uploaded?.data?.id || "").trim();
  if (!id) return null;
  return pollVirusTotalAnalysis(id);
}

/**
 * VT som supplement til heuristik (Fractureiser-lignende supply chain m.m.).
 * - Automatisk blokering kun ved flere “malicious” (standard 4), jf. almindelig VT-tolkning.
 * - Hvis langt de fleste motorer siger “harmless/undetected”, dæmpes 1–3 “malicious” (typiske FP på legit .jar).
 */
function mergeVirusTotalIntoResult(result, vt) {
  if (!vt) return;
  const mal = Number(vt.malicious || 0);
  const engines = Number(vt.engines || 0);
  const sus = Number(vt.suspicious || 0);
  const harmless = Number(vt.harmless || 0);
  const undetected = Number(vt.undetected || 0);
  const timeout = Number(vt.timeout || 0);
  const threatLabel = String(vt.threatLabel || "").trim();
  if (!Array.isArray(result.reasons)) result.reasons = [];
  const cleanRatio = engines > 0 ? (harmless + undetected) / engines : 0;
  const strongCleanConsensus = engines >= 18 && cleanRatio >= 0.86 && mal > 0 && mal < VT_MALICIOUS_BLOCK_MIN;

  if (mal >= VT_MALICIOUS_BLOCK_MIN) {
    result.score = Number(result.score || 0) + 150;
    result.reasons.push(`VirusTotal: ${mal}/${engines} malicious (≥${VT_MALICIOUS_BLOCK_MIN} motorer — konsensus)`);
  } else if (mal >= 2) {
    const bump = strongCleanConsensus ? 12 : 35;
    result.score = Number(result.score || 0) + bump;
    result.reasons.push(
      strongCleanConsensus
        ? `VirusTotal: ${mal}/${engines} malicious (lav vægt: stor enighed om ren fil)`
        : `VirusTotal: ${mal}/${engines} malicious (moderat)`,
    );
  } else if (mal === 1) {
    const bump = strongCleanConsensus ? 2 : 8;
    result.score = Number(result.score || 0) + bump;
    result.reasons.push(
      strongCleanConsensus
        ? `VirusTotal: 1/${engines} malicious (næsten ignoreret — typisk falsk positiv)`
        : `VirusTotal: 1/${engines} malicious (lav vægt — ofte falsk positiv)`,
    );
  }
  if (sus >= 4 && mal === 0) {
    const susBump = strongCleanConsensus ? 8 : sus >= 12 ? 28 : 16;
    result.score = Number(result.score || 0) + susBump;
    result.reasons.push(`VirusTotal: ${sus}/${engines} suspicious`);
  }
  if (timeout >= 8 && mal === 0) {
    result.score = Number(result.score || 0) + 8;
    result.reasons.push(`VirusTotal: ${timeout} motorer timeout (uafklaret, scannes strengere lokalt)`);
  }
  if (threatLabel && /(trojan|stealer|backdoor|ransom|miner|worm|rat|spyware|dropper|loader)/i.test(threatLabel)) {
    result.score = Number(result.score || 0) + 35;
    result.reasons.push(`VirusTotal threat label: ${threatLabel}`);
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
    const msg = String(err?.message || err || "");
    if (/http_404|http_403|bad_manifest|update_feed_unreachable/i.test(msg)) {
      // Ofte: manifest-URL findes ikke endnu — ikke spam loggen
      return;
    }
    sendLog(`[SKIMO] Update-check fejl: ${msg}\n`);
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

function getHistoryFilePath() {
  return path.join(getUserDataDir(), "history.json");
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
    stagingMods: path.join(base, "Staging", ".minecraft", "mods"),
  };
}

/** Mods-mappe ved siden af .app (fx .../PROJEKTSANDRA2026 AFLEVERING/Mods). */
function getBundledSiblingModsFolder() {
  try {
    const contentsMacOS = path.dirname(process.execPath);
    const contents = path.dirname(contentsMacOS);
    const bundleRoot = path.dirname(contents);
    const parentOfBundle = path.dirname(bundleRoot);
    return path.join(parentOfBundle, "Mods");
  } catch {
    return "";
  }
}

async function applyBundledModsDestination() {
  const mods = getBundledSiblingModsFolder();
  if (!mods) return;
  try {
    if (fssync.existsSync(mods) && fssync.statSync(mods).isDirectory()) {
      destinationFolder = mods;
      await saveState();
    }
  } catch (err) {
    console.error("[SKIMO] applyBundledModsDestination:", err?.message || err);
  }
}

async function runBatchScanFolderReadOnly(folder) {
  const locale = getLocale();
  let names = [];
  try {
    names = await fs.readdir(folder);
  } catch (err) {
    throw new Error(err?.message || String(err));
  }
  const jars = names.filter((n) => getExtLower(n) === ".jar");
  sendLog(`[SKIMO] Batch-scan: ${jars.length} jar-filer i ${folder}\n`);
  const skipBatchVt = String(process.env.SKIMO_BATCH_SKIP_VT || "").trim() === "1";
  if (!skipBatchVt && getVtApiKey()) {
    sendLog("[SKIMO] Batch-scan bruger VirusTotal public API pr. mod (langsomt med vilje pga. public rate limit).\n");
  }
  let scanned = 0;
  for (const name of jars) {
    const full = path.join(folder, name);
    try {
      await scanLocalJarReadOnly(full, locale, { skipVt: skipBatchVt });
      scanned += 1;
    } catch (err) {
      sendLog(`[SKIMO] Fejl ved ${name}: ${err?.message || err}\n`);
    }
  }
  lastEvent = {
    at: new Date().toISOString(),
    fileName: `${scanned} filer`,
    status: "clean",
    message: `Batch-scan færdig (${scanned}/${jars.length})`,
  };
  broadcastState();
  return { scanned, total: jars.length };
}

async function autoRunBundledModsBatchScan() {
  if (!activated) {
    sendLog("[SKIMO] Auto batch-scan: aktiver appen først.\n");
    return;
  }
  const mods = getBundledSiblingModsFolder();
  if (!mods || !fssync.existsSync(mods) || !fssync.statSync(mods).isDirectory()) {
    sendLog("[SKIMO] Auto batch-scan: ingen Mods-mappe ved siden af app-pakken.\n");
    return;
  }
  const locale = getLocale();
  try {
    ensureSubscriptionAllowsUse(locale);
  } catch (err) {
    sendLog(`[SKIMO] Auto batch-scan aflyst (abonnement): ${err?.message || err}\n`);
    return;
  }
  clearQueue();
  sendLog("[SKIMO] Automatisk batch-scan af Mods-mappen ved siden af appen...\n");
  await runBatchScanFolderReadOnly(mods);
}

function hardenWebContents(contents) {
  if (!contents) return;
  try {
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
  } catch {}

  try {
    contents.on("will-attach-webview", (event) => {
      event.preventDefault();
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
  const { appVersion, appBuildId } = getAppReleaseInfo();
  return {
    locale,
    appVersion,
    appBuildId,
    activated,
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
    history: history.slice(0, MAX_HISTORY_MODS),
    paths: getSandboxPaths(),
  };
}

function broadcastState() {
  const payload = getPublicState();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("state-update", payload);
  if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.webContents.send("state-update", payload);
  updateTrayMenu();
}

async function loadState() {
  try {
    const raw = await fs.readFile(getStateFilePath(), "utf8");
    const parsed = JSON.parse(raw);

    // Hvis appen er re-installeret/udskiftet: kræv ny abonnementkode igen.
    const savedFingerprint = typeof parsed.installFingerprint === "string" ? parsed.installFingerprint : "";
    if (currentInstallFingerprint) {
      if (!savedFingerprint || savedFingerprint !== currentInstallFingerprint) {
        activated = false;
        activationInfo = { country: "", code: "" };
        subscriptionState = evaluateSubscriptionState(resetTestProfileIfNeeded(parsed.subscriptionState));
        protectionEnabled = false;
        destinationFolder = "";
        return;
      }
    }

    activated = !!parsed.activated;
    activationInfo = parsed.activationInfo && typeof parsed.activationInfo === "object" ? parsed.activationInfo : { country: "", code: "" };
    subscriptionState = evaluateSubscriptionState(resetTestProfileIfNeeded(parsed.subscriptionState));
    preferredLocale = sanitizeLocale(parsed.preferredLocale);

    protectionEnabled = !!parsed.protectionEnabled;
    destinationFolder = typeof parsed.destinationFolder === "string" ? parsed.destinationFolder : "";
    applySubscriptionRuntimeState();
  } catch {
    activated = false;
    activationInfo = { country: "", code: "" };
    subscriptionState = evaluateSubscriptionState(resetTestProfileIfNeeded(null));
    preferredLocale = "";
    protectionEnabled = false;
    destinationFolder = "";
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

/**
 * Ekstra "load-simulering": det Minecraft loaderen gør første gang (læs hele ZIP som stream og tjek CRC).
 * Erstatter IKKE rigtig spil-kørsel (kræver fuld client + mods mappe); fanger korrupte/pakkefejl der ofte giver crash ved start.
 */
async function runMinecraftJarLoadSimulation(stagedFilePath) {
  const loadSimulation = {
    ranAt: new Date().toISOString(),
    zipIntegrityOk: null,
    mimeType: "",
    note: "ZIP/CRC-check som ved ClassLoader's første åbning af JAR (ikke fuld Minecraft-runtime).",
  };
  const extras = [];
  let scoreBump = 0;

  try {
    const zipTest = await Promise.race([
      spawnCapture(UNZIP_CMD, ["-t", "-qq", stagedFilePath], { maxBytes: 250_000 }),
      sleep(120_000).then(() => ({ code: 124, output: Buffer.from("timeout efter 120s"), truncated: true })),
    ]);
    if (zipTest.code === 0) {
      loadSimulation.zipIntegrityOk = true;
      extras.push("MC load-sim: ZIP-integritet OK (fuld CRC-test)");
    } else {
      loadSimulation.zipIntegrityOk = false;
      scoreBump += 72;
      const tail = zipTest.output.toString("utf8", 0, 800).trim();
      extras.push(`MC load-sim: ZIP-integritet fejlede (typisk crash ved load)${tail ? ` — ${tail}` : ""}`);
    }
  } catch (err) {
    loadSimulation.zipIntegrityOk = false;
    scoreBump += 40;
    extras.push(`MC load-sim: kunne ikke køre ZIP-test (${err?.message || err})`);
  }

  if (process.platform === "darwin" && fssync.existsSync("/usr/bin/file")) {
    try {
      const r = spawnSync("/usr/bin/file", ["-b", "--mime-type", stagedFilePath], { encoding: "utf8", timeout: 5000 });
      const mime = String(r.stdout || "").trim();
      loadSimulation.mimeType = mime;
      const m = mime.toLowerCase();
      if (m && !m.includes("zip") && !m.includes("java-archive") && !m.includes("empty") && !m.includes("octet-stream")) {
        scoreBump += 35;
        extras.push(`MC load-sim: usædvanlig MIME for .jar: ${mime}`);
      }
    } catch {
      // ignore
    }
  }

  return { scoreBump, extras, loadSimulation };
}

/**
 * Fuld "i spillet"-vurdering kræver DIN Minecraft (launcher/server). ModGuard kan køre et
 * brugerdefineret shell-kald pr. mod: sæt miljøvariablen SKIMO_MC_GAME_PROBE_CMD (evt. i
 * LaunchAgent eller før du starter appen). Pladsholdere: %JAR% og %FILE%
 * Miljø under kørsel: SKIMO_PROBE_JAR, SKIMO_PROBE_FILE, SKIMO_PROBE_NAME.
 * Valgfrit: SKIMO_MC_GAME_PROBE_CWD (arbejdsmappe), SKIMO_MC_GAME_PROBE_TIMEOUT_MS (default 180000).
 */
function getMcGameProbeCommand() {
  return String(process.env.SKIMO_MC_GAME_PROBE_CMD || "").trim();
}

function getMcGameProbeTimeoutMs() {
  const n = Number.parseInt(String(process.env.SKIMO_MC_GAME_PROBE_TIMEOUT_MS || "180000").trim(), 10);
  return Number.isFinite(n) ? Math.min(900_000, Math.max(30_000, n)) : 180_000;
}

/** Mappe med afleveringsfiler (.app ligger typisk her). Bruges til auto klient-/server-probe + VT efter probe. */
function getDeliverableProjectRoot() {
  const seen = new Set();
  const tryDir = (dir) => {
    const d = String(dir || "").trim();
    if (!d || seen.has(d)) return "";
    seen.add(d);
    try {
      if (
        fssync.existsSync(path.join(d, "mc_game_probe_fabric_server.sh")) ||
        fssync.existsSync(path.join(d, "mc_game_probe_eksempel.sh")) ||
        fssync.existsSync(path.join(d, "modguard_prism_client_probe.txt")) ||
        fssync.existsSync(path.join(d, "modguard_prism_client_probe.example.txt"))
      ) {
        return d;
      }
    } catch {}
    return "";
  };
  try {
    const ex = String(process.execPath || "");
    const m = ex.match(/(^.*\.app)\/Contents\/MacOS\//i);
    if (m && m[1]) {
      const sib = tryDir(path.dirname(m[1]));
      if (sib) return sib;
    }
  } catch {}
  let cur = path.dirname(String(process.execPath || ""));
  for (let i = 0; i < 10; i++) {
    const hit = tryDir(cur);
    if (hit) return hit;
    const p = path.dirname(cur);
    if (p === cur) break;
    cur = p;
  }
  try {
    const dev = path.join(__dirname, "..");
    const hit = tryDir(dev);
    if (hit) return hit;
  } catch {}
  return "";
}

function getFabricProbeModsDir() {
  const d = String(process.env.MODGUARD_PROBE_SERVER_DIR || "").trim();
  if (!d) return "";
  return path.join(d, "mods");
}

function getDefaultPrismDataRoot() {
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "PrismLauncher");
  if (process.platform === "win32") return path.join(String(process.env.APPDATA || "").trim(), "PrismLauncher");
  return path.join(os.homedir(), ".local", "share", "PrismLauncher");
}

function readPrismClientInstanceFromDeliverable(root) {
  const envId = String(process.env.MODGUARD_PRISM_CLIENT_INSTANCE_ID || "").trim();
  if (envId) return envId;
  const p = path.join(root, "modguard_prism_client_probe.txt");
  try {
    const raw = String(fssync.readFileSync(p, "utf8") || "");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      return t;
    }
  } catch {}
  return "";
}

function defaultPrismLauncherBinary() {
  if (process.platform === "darwin") {
    const p = "/Applications/Prism Launcher.app/Contents/MacOS/prismlauncher";
    return fssync.existsSync(p) ? p : "";
  }
  if (process.platform === "win32") {
    const p = path.join(String(process.env.LOCALAPPDATA || "").trim(), "Programs", "PrismLauncher", "prismlauncher.exe");
    return fssync.existsSync(p) ? p : "";
  }
  const p = "/usr/bin/prismlauncher";
  return fssync.existsSync(p) ? p : "";
}

/** mods/-mappe til VT-snapshot efter probe: Prism-klient hvis aktiv, ellers Fabric-server. */
function getGameProbeModsDirForVt() {
  const id = String(process.env.MODGUARD_PRISM_INSTANCE_ID || "").trim();
  if (id) {
    const root = String(process.env.MODGUARD_PRISM_ROOT || "").trim() || getDefaultPrismDataRoot();
    const mods = path.join(root, "instances", id, "minecraft", "mods");
    if (fssync.existsSync(mods)) return mods;
  }
  return getFabricProbeModsDir();
}

async function listModsJarSnapshot(modsDir) {
  const map = new Map();
  if (!modsDir || !fssync.existsSync(modsDir)) return map;
  let dirents = [];
  try {
    dirents = await fs.readdir(modsDir, { withFileTypes: true });
  } catch {
    return map;
  }
  for (const ent of dirents) {
    if (!ent.isFile()) continue;
    const nm = String(ent.name || "");
    if (!nm.toLowerCase().endsWith(".jar")) continue;
    try {
      const st = await fs.stat(path.join(modsDir, nm));
      map.set(nm, st.size);
    } catch {}
  }
  return map;
}

/** VT på .jar i probe-mods der er nye eller ændrede under spil-probe (fx droppet malware). */
async function applyPostProbeDroppedJarVtScan(modsDir, beforeSnap, skipJarLower = new Set()) {
  const out = [];
  if (!modsDir || !beforeSnap || !getVtApiKey()) return out;
  const afterSnap = await listModsJarSnapshot(modsDir);
  const names = [];
  for (const [name, size] of afterSnap.entries()) {
    const low = name.toLowerCase();
    if (!low.endsWith(".jar")) continue;
    if (skipJarLower.has(low)) continue;
    const prev = beforeSnap.get(name);
    if (prev !== undefined && prev === size) continue;
    names.push(name);
  }
  let n = 0;
  for (const name of names) {
    if (n >= 6) break;
    const full = path.join(modsDir, name);
    let st;
    try {
      st = await fs.stat(full);
    } catch {
      continue;
    }
    if (st.size > 85_000_000) continue;
    let hash = "";
    try {
      hash = sha256FileSync(full);
    } catch {
      continue;
    }
    const vt = await fetchVirusTotalVerdictForFile(hash, full, name);
    out.push({ fileName: name, hash, vt });
    n += 1;
  }
  return out;
}

function runFabricProbeSetupScript(serverDir, setupScript) {
  return new Promise((resolve) => {
    let buf = "";
    const acc = (d) => {
      buf += d.toString();
      if (buf.length > 14_000) buf = buf.slice(-8000);
    };
    const child = spawn("/bin/bash", [setupScript], {
      env: { ...process.env, MODGUARD_PROBE_SERVER_DIR: serverDir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", acc);
    child.stderr?.on("data", acc);
    const killTimer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
    }, 900_000);
    child.on("close", (code) => {
      clearTimeout(killTimer);
      if (code !== 0) sendLog(`[SKIMO] Fabric setup afsluttet med exit ${code}: ${buf.slice(-1800)}\n`);
      resolve(code === 0);
    });
    child.on("error", (err) => {
      clearTimeout(killTimer);
      sendLog(`[SKIMO] Fabric setup kunne ikke startes: ${err?.message || err}\n`);
      resolve(false);
    });
  });
}

async function applyAutoMinecraftProbeEnvironment() {
  if (String(process.env.SKIMO_AUTO_MINECRAFT_PROBE || "").trim() === "0") return;
  if (!fssync.existsSync("/bin/bash")) return;
  const root = getDeliverableProjectRoot();
  if (!root) return;
  if (String(process.env.SKIMO_MC_GAME_PROBE_CMD || "").trim()) return;

  /** Prism = fuld klient. Fabric-server kører som standard når Prism ikke er sat op (hver .jar skal gennem JVM). Slå server fra: SKIMO_AUTO_FABRIC_PROBE=0 */
  const fabricServerDisabled = String(process.env.SKIMO_AUTO_FABRIC_PROBE || "").trim() === "0";

  let probeConfigured = false;

  if (process.platform !== "win32") {
    const prismScript = path.join(root, "mc_game_probe_eksempel.sh");
    const prismId = readPrismClientInstanceFromDeliverable(root);
    const prismBin = String(process.env.MODGUARD_PRISM_CMD || "").trim() || defaultPrismLauncherBinary();
    if (prismId && fssync.existsSync(prismScript) && prismBin) {
      const prismData = String(process.env.MODGUARD_PRISM_ROOT || "").trim() || getDefaultPrismDataRoot();
      const modsProbe = path.join(prismData, "instances", prismId, "minecraft", "mods");
      if (fssync.existsSync(modsProbe)) {
        process.env.MODGUARD_PRISM_INSTANCE_ID = prismId;
        process.env.MODGUARD_PRISM_LAUNCH = "1";
        if (!String(process.env.MODGUARD_PRISM_CMD || "").trim()) {
          process.env.MODGUARD_PRISM_CMD = prismBin;
        }
        process.env.SKIMO_MC_GAME_PROBE_CMD = `bash "${prismScript}"`;
        if (!String(process.env.SKIMO_MC_GAME_PROBE_TIMEOUT_MS || "").trim()) {
          process.env.SKIMO_MC_GAME_PROBE_TIMEOUT_MS = "900000";
        }
        sendLog("[SKIMO] Prism **100% klient-probe** aktiv — samme Minecraft-klient som når du spiller.\n");
        probeConfigured = true;
      } else {
        sendLog(
          `[SKIMO] Prism-klient: instans «${prismId}» findes ikke under ${prismData} — opret test-instans i Prism og skriv mappe-ID i modguard_prism_client_probe.txt.\n`,
        );
      }
    } else if (prismId && fssync.existsSync(prismScript) && !prismBin) {
      sendLog("[SKIMO] Prism Launcher ikke fundet — installer Prism eller sæt MODGUARD_PRISM_CMD til prismlauncher.\n");
    }
  }

  if (!probeConfigured && !fabricServerDisabled && process.platform !== "win32") {
    const serverDir = path.join(root, "modguard_fabric_probe_env");
    const probeScript = path.join(root, "mc_game_probe_fabric_server.sh");
    const setupScript = path.join(root, "scripts", "setup_modguard_fabric_probe_server.sh");
    if (fssync.existsSync(probeScript)) {
      if (!String(process.env.MODGUARD_PROBE_SERVER_DIR || "").trim()) {
        process.env.MODGUARD_PROBE_SERVER_DIR = serverDir;
      }
      const launchJar = path.join(serverDir, "fabric-server-launch.jar");
      if (!fssync.existsSync(launchJar) && fssync.existsSync(setupScript)) {
        sendLog("[SKIMO] Henter/installerer Fabric probe-server (første gang, kan tage flere minutter) …\n");
        const ok = await runFabricProbeSetupScript(serverDir, setupScript);
        if (!ok || !fssync.existsSync(launchJar)) {
          sendLog("[SKIMO] Fabric probe-server ikke klar — tjek netværk/Java 17.\n");
        }
      }
      if (fssync.existsSync(launchJar)) {
        process.env.SKIMO_MC_GAME_PROBE_CMD = `bash "${probeScript}"`;
        if (!String(process.env.SKIMO_MC_GAME_PROBE_TIMEOUT_MS || "").trim()) {
          process.env.SKIMO_MC_GAME_PROBE_TIMEOUT_MS = "600000";
        }
        sendLog("[SKIMO] Fabric **server**-probe aktiv (hver mod loades i JVM før VT — fuld klient: brug Prism-fil).\n");
        probeConfigured = true;
      }
    }
  }

  if (!String(process.env.SKIMO_MC_GAME_PROBE_CMD || "").trim()) {
    try {
      if (!globalThis.__MODGUARD_FULL_CLIENT_PROBE_HINT) {
        globalThis.__MODGUARD_FULL_CLIENT_PROBE_HINT = true;
        sendLog(
          "[SKIMO] **Fuld klient:** opret `modguard_prism_client_probe.txt` (se `.example`). Fabric-server-fallback er **til** som standard så hver .jar kører i JVM; slå den fra med `SKIMO_AUTO_FABRIC_PROBE=0` kun hvis du sætter `SKIMO_MC_GAME_PROBE_CMD` selv.\n",
        );
      }
    } catch {}
  }
}

async function runConfiguredMinecraftGameProbe(stagedFilePath, fileName) {
  const cmd = getMcGameProbeCommand();
  if (!cmd) return { ran: false, scoreBump: 0, summary: "", detail: null };

  const timeoutMs = getMcGameProbeTimeoutMs();
  const cwdRaw = String(process.env.SKIMO_MC_GAME_PROBE_CWD || "").trim();
  const cwd = cwdRaw && fssync.existsSync(cwdRaw) ? cwdRaw : undefined;
  const env = {
    ...process.env,
    SKIMO_PROBE_JAR: stagedFilePath,
    SKIMO_PROBE_FILE: fileName,
    SKIMO_PROBE_NAME: fileName,
  };
  const interpolated = cmd.replace(/%JAR%/g, stagedFilePath).replace(/%FILE%/g, fileName);
  const isWin = process.platform === "win32";

  const result = await new Promise((resolve) => {
    const exe = isWin ? process.env.ComSpec || "cmd.exe" : "/bin/bash";
    const args = isWin ? ["/d", "/s", "/c", interpolated] : ["-c", interpolated];
    const child = spawn(exe, args, { env, cwd, windowsHide: true });
    let buf = "";
    const acc = (d) => {
      buf += d.toString();
      if (buf.length > 120_000) buf = buf.slice(-120_000);
    };
    child.stdout?.on("data", acc);
    child.stderr?.on("data", acc);
    const killer = setTimeout(() => {
      try {
        child.kill(isWin ? undefined : "SIGTERM");
      } catch {}
      setTimeout(() => {
        try {
          child.kill(isWin ? undefined : "SIGKILL");
        } catch {}
      }, 5000);
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(killer);
      resolve({ code: code ?? 0, buf });
    });
    child.on("error", (err) => {
      clearTimeout(killer);
      resolve({ code: 1, buf: String(err?.message || err) });
    });
  });

  const detail = {
    exitCode: result.code,
    timeoutMs,
    excerpt: result.buf.trim().slice(-1200),
  };

  if (result.code !== 0) {
    return {
      ran: true,
      scoreBump: 15,
      summary: `MC spil-probe: modden kunne ikke loades rent i testmiljøet (exit ${result.code}) — advarsel, ikke blokering alene`,
      detail,
    };
  }
  return {
    ran: true,
    scoreBump: 0,
    summary: "MC spil-probe: dit probe-script OK (exit 0)",
    detail,
  };
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
  const locale = getLocale();
  const { code, output } = await spawnCapture(UNZIP_CMD, ["-Z1", zipPath], { maxBytes: 3_000_000 });
  if (code !== 0) throw new Error(t(locale, "err.unzipFailed"));
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

function bufferToSearchableLower(buf) {
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

function sha1FileSync(filePath) {
  const h = crypto.createHash("sha1");
  h.update(fssync.readFileSync(filePath));
  return h.digest("hex");
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

function isLikelyMinecraftMod(fileName) {
  if (!fileName || typeof fileName !== "string") return false;
  if (fileName.startsWith(".")) return false;
  const name = stripTempDownloadSuffix(fileName);
  const lower = String(name || "").toLowerCase();
  return lower.endsWith(".jar") || lower.endsWith(".zip") || lower.endsWith(".mcpack") || lower.endsWith(".mcaddon");
}

function showWidgetTransient(ms = 4500) {
  try {
    ensureWidgetWindow();
    if (!widgetWindow || widgetWindow.isDestroyed()) return;
    if (typeof widgetWindow.showInactive === "function") widgetWindow.showInactive();
    else widgetWindow.show();

    if (widgetHideTimer) clearTimeout(widgetHideTimer);
    widgetHideTimer = setTimeout(() => {
      try {
        if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.hide();
      } catch {
        // ignore
      }
    }, ms);
  } catch {
    // ignore
  }
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

async function ensureDestinationFolderInteractive() {
  if (destinationFolder) return destinationFolder;

  ensureMainWindow({ showOnReady: true });
  const locale = getLocale();
  const recommended = path.join(app.getPath("home"), "Library", "Application Support", "minecraft", "mods");
  const result = await dialog.showOpenDialog(mainWindow, {
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

function extractClassUtf8Strings(buf, { maxStrings = 500, maxLen = 4096 } = {}) {
  // Minimal .class constant-pool UTF8 extractor
  // Spec: https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-4.html
  const out = [];
  try {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return out;
    if (buf.readUInt32BE(0) !== 0xcafebabe) return out;
    const cpCount = buf.readUInt16BE(8);
    let off = 10;
    for (let i = 1; i < cpCount && off < buf.length; i++) {
      const tag = buf.readUInt8(off);
      off += 1;
      if (tag === 1) {
        if (off + 2 > buf.length) break;
        const len = buf.readUInt16BE(off);
        off += 2;
        if (off + len > buf.length) break;
        const slice = buf.subarray(off, off + len);
        off += len;
        if (len > 0 && len <= maxLen) {
          // Modified UTF-8: decode best-effort as utf8; fallback to latin1
          let s = "";
          try {
            s = slice.toString("utf8");
          } catch {
            s = slice.toString("latin1");
          }
          if (s) out.push(s);
          if (out.length >= maxStrings) break;
        }
      } else if (tag === 3 || tag === 4) {
        off += 4;
      } else if (tag === 5 || tag === 6) {
        off += 8;
        i++; // long/double take two entries
      } else if (tag === 7 || tag === 8 || tag === 16 || tag === 19 || tag === 20) {
        off += 2;
      } else if (tag === 9 || tag === 10 || tag === 11 || tag === 12 || tag === 18) {
        off += 4;
      } else if (tag === 15) {
        off += 3;
      } else if (tag === 17) {
        off += 4;
      } else {
        break;
      }
    }
  } catch {
    return out;
  }
  return out;
}

async function zipLooksLikeMinecraftContent(zipPath) {
  try {
    const entries = (await unzipListEntries(zipPath)).filter((e) => e && !e.endsWith("/"));
    if (!entries.length) return false;
    const namesLower = entries.join("\n").toLowerCase();
    return (
      namesLower.includes("pack.mcmeta") ||
      namesLower.includes("manifest.json") ||
      namesLower.includes("assets/minecraft/") ||
      namesLower.includes("data/") ||
      namesLower.includes("resourcepacks/") ||
      namesLower.includes("resource_packs/") ||
      namesLower.includes("behavior_packs/") ||
      namesLower.includes("behaviorpacks/") ||
      namesLower.includes("fabric.mod.json") ||
      namesLower.includes("mods.toml")
    );
  } catch {
    return false;
  }
}

async function scanMinecraftArchiveStagedFile(stagedFilePath, fileName) {
  const reasons = [];
  let score = 0;
  const add = (weight, why) => {
    score += weight;
    reasons.push(why);
  };
  const hash = (() => {
    try {
      return sha256FileSync(stagedFilePath);
    } catch {
      return "";
    }
  })();

  const header = await readHeaderBytes(stagedFilePath, 2);
  if (header.toString("ascii", 0, Math.min(2, header.length)) !== "PK") {
    add(100, "Ugyldigt ZIP/pack format (mangler PK header)");
    return { suspicious: true, score, reasons, hash };
  }

  let entries = [];
  try {
    entries = (await unzipListEntries(stagedFilePath)).filter((e) => e && !e.endsWith("/"));
  } catch (err) {
    add(100, `Kunne ikke liste pack entries: ${err?.message || err}`);
    return { suspicious: true, score, reasons, hash };
  }

  const blockedEntryExts = new Set([".exe", ".dll", ".dylib", ".so", ".bat", ".cmd", ".ps1", ".vbs", ".sh", ".app", ".pkg", ".command", ".lnk", ".url"]);
  let contentType = "Archive";
  const namesLower = entries.join("\n").toLowerCase();
  if (namesLower.includes("pack.mcmeta") || namesLower.includes("assets/minecraft/")) contentType = "Resource Pack";
  if (namesLower.includes("manifest.json") && (namesLower.includes("behavior_packs/") || namesLower.includes("scripts/"))) contentType = "Behavior Pack";

  for (const entry of entries) {
    const entryLower = String(entry || "").toLowerCase();
    if (entryLower.includes("..") || entryLower.startsWith("/") || entryLower.startsWith("\\")) {
      add(100, `Zip path traversal/absolut sti: ${entry}`);
      return { suspicious: true, score, reasons, hash, contentType };
    }
    const ext = getExtLower(entry);
    if (blockedEntryExts.has(ext)) {
      add(100, `Embedded '${ext}' i pack: ${entry}`);
      return { suspicious: true, score, reasons, hash, contentType };
    }
  }

  const patterns = [
    { needle: "discord.com/api/webhooks", weight: 100, why: "Discord webhook" },
    { needle: "discordapp.com/api/webhooks", weight: 100, why: "Discord webhook" },
    { needle: "api.telegram.org", weight: 95, why: "Telegram bot/exfil indikator" },
    { needle: "powershell", weight: 90, why: "PowerShell exec" },
    { needle: "cmd.exe", weight: 90, why: "Windows exec" },
    { needle: "/bin/sh", weight: 90, why: "Shell exec" },
    { needle: "osascript", weight: 80, why: "macOS script exec" },
    { needle: "curl ", weight: 65, why: "Download/command indikator" },
    { needle: "wget ", weight: 65, why: "Download/command indikator" },
    { needle: "coinhive", weight: 100, why: "Cryptojacking indikator" },
    { needle: "xmrig", weight: 100, why: "Cryptojacking indikator" },
    { needle: "stratum+tcp", weight: 90, why: "Mining indikator" },
    { needle: "ransom", weight: 100, why: "Ransomware indikator" },
    { needle: "encrypt", weight: 35, why: "Krypteringsadfærd indikator" },
    { needle: "websocket", weight: 25, why: "Remote control indikator" },
  ];

  const considerTextExts = new Set([".json", ".png", ".mcmeta", ".txt", ".lang", ".properties", ".cfg", ".ini", ".xml", ".js"]);
  const seen = new Set();
  let scanned = 0;
  for (const entry of entries) {
    if (scanned >= 400) break;
    const ext = getExtLower(entry);
    if (!considerTextExts.has(ext) && !String(entry).toLowerCase().endsWith("manifest.json")) continue;
    const { ok, output } = await unzipReadEntry(stagedFilePath, entry, { maxBytes: 1_500_000 });
    if (!ok || output.length === 0) continue;
    const lower = bufferToSearchableLower(output);
    for (const p of patterns) {
      if (seen.has(p.needle)) continue;
      if (lower.includes(p.needle)) {
        seen.add(p.needle);
        add(p.weight, p.why);
      }
    }
    scanned++;
  }

  if (contentType === "Archive" && !namesLower.includes(".jar")) add(25, "Uklar Minecraft-pack type");
  return { suspicious: score >= SCAN_BLOCK_SCORE_THRESHOLD, score, reasons, hash, contentType };
}

async function scanMinecraftJarStagedFile(stagedFilePath, fileName) {
  const reasons = [];
  let score = 0;
  const add = (weight, why) => {
    score += weight;
    reasons.push(why);
  };

  const hash = (() => {
    try {
      return sha256FileSync(stagedFilePath);
    } catch {
      return "";
    }
  })();

  // Basic sanity checks
  try {
    const st = await fs.stat(stagedFilePath);
    if (st.size <= 0) add(100, "Tom fil");
    if (st.size > 300_000_000) add(60, "Meget stor JAR (usædvanligt for en mod)");
  } catch {
    add(100, "Kunne ikke læse filstat");
  }

  const header = await readHeaderBytes(stagedFilePath, 4);
  const sig2 = header.toString("ascii", 0, Math.min(2, header.length));
  if (sig2 !== "PK") {
    add(100, "Ugyldigt JAR/ZIP format (mangler PK header)");
    return { suspicious: true, score, reasons, hash };
  }

  let entries = [];
  try {
    entries = (await unzipListEntries(stagedFilePath)).filter((e) => e && !e.endsWith("/"));
  } catch (err) {
    add(100, `Kunne ikke liste JAR entries: ${err?.message || err}`);
    return { suspicious: true, score, reasons, hash };
  }

  if (entries.length === 0) {
    add(90, "JAR uden filer");
    return { suspicious: true, score, reasons, hash };
  }

  // Path traversal / absolute paths
  for (const entry of entries) {
    const cleanEntry = String(entry || "");
    const entryLower = cleanEntry.toLowerCase();
    if (entryLower.includes("..") || entryLower.startsWith("/") || entryLower.startsWith("\\")) {
      add(100, `Zip path traversal/absolut sti: ${cleanEntry}`);
      return { suspicious: true, score, reasons, hash };
    }
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
    ".app",
    ".pkg",
    ".command",
    ".lnk",
    ".url",
  ]);
  for (const entry of entries) {
    const ext = getExtLower(entry);
    if (blockedEntryExts.has(ext)) {
      const nativeLib = ext === ".dll" || ext === ".dylib" || ext === ".so";
      add(nativeLib ? 35 : 90, `Embedded '${ext}' i JAR: ${entry}`);
    }
  }

  const namesLower = entries.join("\n").toLowerCase();
  const hasModMeta =
    namesLower.includes("fabric.mod.json") ||
    namesLower.includes("quilt.mod.json") ||
    namesLower.includes("meta-inf/mods.toml") ||
    namesLower.includes("mcmod.info");
  if (!hasModMeta) add(8, "Mangler typisk mod-metadata (fabric.mod.json/mods.toml/mcmod.info)");

  // Fractureiser / kendte indikatorer
  const fractureIocs = [
    "fractureiser",
    "fracturiser",
    "85.217.144.130",
    "files-8ie.pages.dev",
    ".config/.data/lib.jar",
    "microsoft edge/libwebgl64.jar",
    "libwebgl64.jar",
    "client.jar",
    "skyrage",
  ];
  for (const ioc of fractureIocs) {
    if (namesLower.includes(ioc)) add(220, `Kendt malware-indikator: ${ioc}`);
  }

  // Manifest checks
  const manifestEntry = entries.find((e) => String(e).toLowerCase() === "meta-inf/manifest.mf");
  if (manifestEntry) {
    const { ok, output } = await unzipReadEntry(stagedFilePath, manifestEntry, { maxBytes: 200_000 });
    if (ok && output.length) {
      const manLower = bufferToSearchableLower(output);
      if (manLower.includes("premain-class") || manLower.includes("agent-class") || manLower.includes("can-retransform-classes")) {
        add(130, "Manifest indeholder Java Agent/Premain (meget mistænkeligt for mods)");
      }
    }
  }

  // String patterns (jar resources + class constants)
  const patterns = [
    { needle: "discord.com/api/webhooks", weight: 75, why: "Discord webhook" },
    { needle: "discordapp.com/api/webhooks", weight: 75, why: "Discord webhook" },
    { needle: "api.telegram.org", weight: 70, why: "Telegram bot/exfil indikator" },
    { needle: "pastebin.com", weight: 20, why: "Pastebin payload/host" },
    { needle: "raw.githubusercontent.com", weight: 18, why: "Remote payload (raw GitHub)" },
    { needle: "cdn.discordapp.com/attachments", weight: 30, why: "Remote payload (Discord CDN)" },
    { needle: "mediafire.com", weight: 25, why: "Remote payload/download host" },
    { needle: "dropboxusercontent.com", weight: 25, why: "Remote payload/download host" },
    { needle: "85.217.144.130", weight: 220, why: "Kendt malware IP (Fractureiser)" },
    { needle: "files-8ie.pages.dev", weight: 220, why: "Kendt malware host (Fractureiser)" },
    { needle: "java/lang/runtime", weight: 8, why: "Runtime usage" },
    { needle: "getruntime", weight: 8, why: "Runtime.getRuntime" },
    { needle: "processbuilder", weight: 12, why: "ProcessBuilder" },
    { needle: "java/lang/process", weight: 8, why: "Process API" },
    { needle: "loadlibrary", weight: 12, why: "Native library load" },
    { needle: "system.load", weight: 12, why: "Native library load" },
    { needle: "cmd.exe", weight: 35, why: "Windows exec" },
    { needle: "powershell", weight: 35, why: "PowerShell exec" },
    { needle: "pwsh", weight: 30, why: "PowerShell exec" },
    { needle: "/bin/sh", weight: 35, why: "Shell exec" },
    { needle: "/bin/bash", weight: 35, why: "Shell exec" },
    { needle: "osascript", weight: 35, why: "macOS script exec" },
    { needle: "curl ", weight: 30, why: "Download/command indikator" },
    { needle: "wget ", weight: 30, why: "Download/command indikator" },
    { needle: "java/net/url", weight: 4, why: "Network URL usage" },
    { needle: "httpurlconnection", weight: 6, why: "HTTP download/API usage" },
    { needle: "java/net/socket", weight: 8, why: "Socket usage" },
    { needle: "urlclassloader", weight: 15, why: "Dynamic class loading (URLClassLoader)" },
    { needle: "methodhandles$lookup", weight: 10, why: "Avanceret runtime/reflection indikator" },
    { needle: "java/lang/reflect", weight: 8, why: "Reflection usage" },
    { needle: "defineclass", weight: 15, why: "Dynamic class define" },
    { needle: "invokedynamic", weight: 6, why: "Obfuscation/dynamic dispatch indikator" },
    { needle: "cipher", weight: 4, why: "Crypto usage (Cipher)" },
    { needle: "base64", weight: 2, why: "Base64 usage" },
    { needle: "objectinputstream", weight: 25, why: "Unsafe deserialization / BleedingPipe indikator" },
    { needle: "readobject", weight: 15, why: "Java deserialization indikator" },
    { needle: "token", weight: 4, why: "Token indikator" },
    { needle: "accesstoken", weight: 30, why: "Access-token indikator" },
    { needle: "launcher_accounts.json", weight: 90, why: "Minecraft/Microsoft credential access" },
    { needle: "lastlogin", weight: 20, why: "Minecraft credential access" },
    { needle: "leveldb", weight: 15, why: "Browser/Discord token-store indikator" },
    { needle: "login data", weight: 40, why: "Browser credential database indikator" },
    { needle: "stealer", weight: 95, why: "Stealer indikator" },
    { needle: "backdoor", weight: 95, why: "Backdoor indikator" },
    { needle: "spyware", weight: 95, why: "Spyware indikator" },
    { needle: "clipboard", weight: 15, why: "Clipboard access indikator" },
    { needle: "wallet", weight: 45, why: "Crypto wallet indikator" },
    { needle: "ransom", weight: 130, why: "Ransomware indikator" },
    { needle: "encrypt", weight: 4, why: "Krypteringsadfærd indikator" },
    { needle: "miner", weight: 45, why: "Miner indikator" },
    { needle: "xmrig", weight: 130, why: "XMRig indikator" },
    { needle: "stratum", weight: 35, why: "Mining stratum indikator" },
    { needle: "coinhive", weight: 130, why: "Cryptojacking indikator" },
  ];

  const seen = new Set();
  const considerTextExts = new Set([".json", ".toml", ".yml", ".yaml", ".cfg", ".ini", ".properties", ".txt", ".md", ".xml"]);
  const classEntries = [];
  const textEntries = [];
  for (const entry of entries) {
    const ext = getExtLower(entry);
    if (ext === ".class") classEntries.push(entry);
    else if (considerTextExts.has(ext) || String(entry).toLowerCase().endsWith("mods.toml") || String(entry).toLowerCase().endsWith("fabric.mod.json")) {
      textEntries.push(entry);
    }
  }

  // Scan a subset of text-like entries
  let scannedText = 0;
  const maxTextEntries = Math.max(80, Math.min(1200, Number(process.env.SKIMO_DEEP_TEXT_ENTRY_LIMIT || 500) || 500));
  for (const entry of textEntries) {
    if (scannedText >= maxTextEntries) break;
    const { ok, output } = await unzipReadEntry(stagedFilePath, entry, { maxBytes: 1_500_000 });
    if (!ok || output.length === 0) continue;
    const lower = bufferToSearchableLower(output);
    for (const p of patterns) {
      if (seen.has(p.needle)) continue;
      if (lower.includes(p.needle)) {
        seen.add(p.needle);
        add(p.weight, p.why);
      }
    }
    scannedText++;
  }

  // Scan a subset of class files by extracting constant-pool strings
  let scannedClasses = 0;
  const maxClassEntries = Math.max(120, Math.min(8000, Number(process.env.SKIMO_DEEP_CLASS_ENTRY_LIMIT || 2500) || 2500));
  for (const entry of classEntries) {
    if (scannedClasses >= maxClassEntries) break;
    const { ok, output } = await unzipReadEntry(stagedFilePath, entry, { maxBytes: 2_000_000 });
    if (!ok || output.length === 0) continue;
    const strings = extractClassUtf8Strings(output, { maxStrings: 400 });
    const joinedLower = strings.join("\n").toLowerCase();
    for (const p of patterns) {
      if (seen.has(p.needle)) continue;
      if (joinedLower.includes(p.needle)) {
        seen.add(p.needle);
        add(p.weight, `${p.why} (i class constants)`);
      }
    }
    scannedClasses++;
  }
  reasons.push(`Deep scan: ${scannedClasses}/${classEntries.length} class-filer og ${scannedText}/${textEntries.length} tekst/metadata-filer analyseret`);

  const hasExec = ["cmd.exe", "powershell", "pwsh", "/bin/sh", "/bin/bash", "processbuilder", "getruntime"].some((n) => seen.has(n));
  const hasRemote = [
    "java/net/url",
    "httpurlconnection",
    "java/net/socket",
    "raw.githubusercontent.com",
    "cdn.discordapp.com/attachments",
    "pastebin.com",
    "mediafire.com",
    "dropboxusercontent.com",
  ].some((n) => seen.has(n));
  const hasDynamicLoad = ["urlclassloader", "defineclass", "loadlibrary", "system.load", "java/lang/reflect"].some((n) => seen.has(n));
  const hasCredentialAccess = ["launcher_accounts.json", "lastlogin", "leveldb", "login data", "accesstoken", "token"].some((n) => seen.has(n));
  if (hasExec && hasRemote) add(65, "Kombination: netværk/download + systemkommando");
  if (hasRemote && hasDynamicLoad) add(50, "Kombination: netværk/download + dynamisk code loading");
  if (hasCredentialAccess && (hasRemote || hasExec)) add(110, "Kombination: credential/token access + exfil/exec indikator");
  if (seen.has("objectinputstream") && seen.has("readobject")) add(25, "BleedingPipe-lignende deserialization-mønster (advarsel)");

  // Embedded jar(s) inside jar is uncommon for mods; score it
  const embeddedJarCount = entries.filter((e) => getExtLower(e) === ".jar").length;
  if (embeddedJarCount > 0) add(8, `Indeholder ${embeddedJarCount} indlejret .jar (usædvanligt)`);

  const loadSim = await runMinecraftJarLoadSimulation(stagedFilePath);
  if (loadSim.scoreBump > 0) {
    add(loadSim.scoreBump, loadSim.extras.join(" | "));
  } else {
    for (const line of loadSim.extras) reasons.push(line);
  }

  const modsDirProbe = getGameProbeModsDirForVt();
  let modsSnapBefore = new Map();
  if (modsDirProbe && getMcGameProbeCommand()) {
    modsSnapBefore = await listModsJarSnapshot(modsDirProbe);
  }

  const gameProbe = await runConfiguredMinecraftGameProbe(stagedFilePath, fileName);
  if (gameProbe.ran) {
    loadSim.loadSimulation.gameProbe = gameProbe.detail;
    sendLog(`[SKIMO] MC spil-probe (${fileName}): exit ${gameProbe.detail?.exitCode ?? "?"}\n`);
    if (gameProbe.scoreBump > 0) add(gameProbe.scoreBump, gameProbe.summary);
    else reasons.push(gameProbe.summary);

    if (modsDirProbe) {
      try {
        const skipLower = new Set(
          ["__modguard_runtime_probe.jar", String(fileName || "").trim().toLowerCase()].filter(Boolean),
        );
        const droppedVt = await applyPostProbeDroppedJarVtScan(modsDirProbe, modsSnapBefore, skipLower);
        if (droppedVt.length) {
          loadSim.loadSimulation.postProbeVt = droppedVt;
          const agg = { score, reasons };
          for (const row of droppedVt) {
            if (!row?.vt) continue;
            sendLog(
              `[SKIMO] VirusTotal (efter spil-probe) ${row.fileName}: ${row.vt.malicious}/${row.vt.engines || 0} malicious\n`,
            );
            mergeVirusTotalIntoResult(agg, row.vt);
          }
          score = agg.score;
        }
      } catch (e) {
        sendLog(`[SKIMO] VT-scan af probe-mods fejlede: ${e?.message || e}\n`);
      }
    }
  }

  if (!gameProbe.ran) {
    reasons.push("MC spil-probe kørte ikke — advarsel, ikke blokering alene. Tjek Prism (`modguard_prism_client_probe.txt`), Java/Fabric eller probe-scripts hvis du vil have runtime-test.");
  }

  return {
    suspicious: score >= SCAN_BLOCK_SCORE_THRESHOLD,
    score,
    reasons,
    hash,
    loadSimulation: loadSim.loadSimulation,
  };
}

function addHistoryEntry(entry) {
  history.unshift(entry);
  if (history.length > MAX_HISTORY_MODS) history = history.slice(0, MAX_HISTORY_MODS);
  saveHistory().catch(() => {});
  broadcastState();
}

function clearQueue() {
  scanQueue = [];
  queuedPaths = new Set();
}

async function scanSingleDownloadedFile(downloadPath) {
  const locale = getLocale();
  ensureSubscriptionAllowsUse(locale);
  const fileName = path.basename(downloadPath);
  const ext = getExtLower(fileName);
  const startedAt = new Date().toISOString();

  lastEvent = { at: startedAt, fileName, status: "scanning", message: t(locale, "tray.stateScanning") };
  broadcastState();
  showWidgetTransient();

  const stable = await waitForStableFile(downloadPath);
  if (!stable) {
    lastEvent = { at: new Date().toISOString(), fileName, status: "error", message: t(locale, "err.downloadTimeout") };
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

  if (ext === ".zip" || ext === ".mcpack" || ext === ".mcaddon") {
    const looksLikeMinecraft = await zipLooksLikeMinecraftContent(downloadPath);
    if (!looksLikeMinecraft) {
      lastEvent = { at: new Date().toISOString(), fileName, status: "ignored", message: "Ikke Minecraft indhold (ignoreret)." };
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
      message: t(locale, "err.moveToSandboxFailed", { err: err?.message || String(err) }),
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

    const baseResult =
      ext === ".jar"
        ? await scanMinecraftJarStagedFile(stagedFile, fileName)
        : await scanMinecraftArchiveStagedFile(stagedFile, fileName);
    if (ext === ".jar") {
      sendLog(
        `[SKIMO] ${fileName}: spil-probe afsluttet → VirusTotal → godkend/blok (stadig kun i sandbox — kopieres først til Mods efter ren beslutning).\n`,
      );
    }
    const vt = baseResult?.hash ? await fetchVirusTotalVerdictForFile(baseResult.hash, stagedFile, fileName) : null;
    const result = {
      ...baseResult,
      reasons: Array.isArray(baseResult?.reasons) ? [...baseResult.reasons] : [],
      score: Number(baseResult?.score || 0),
      suspicious: false,
      vt,
    };
    mergeVirusTotalIntoResult(result, vt);
    const malVt = vt ? Number(vt.malicious || 0) : 0;
    result.suspicious = Number(result.score) >= SCAN_BLOCK_SCORE_THRESHOLD || malVt >= VT_MALICIOUS_BLOCK_MIN;
    const sha1 = result.hash ? sha1FileSync(stagedFile) : "";
    sendLog(`[SKIMO] SHA256: ${result.hash || "(ukendt)"}\n`);
    if (result.contentType) sendLog(`[SKIMO] Content type: ${result.contentType}\n`);
    if (vt) sendLog(`[SKIMO] VirusTotal: ${vt.malicious}/${vt.engines || 0} malicious (${vt.source || "report"})\n`);
    sendLog(`[SKIMO] Scan score: ${result.score}\n`);
    if (result.reasons?.length) {
      for (const r of result.reasons) sendLog(`    - ${r}\n`);
    } else {
      sendLog("    - Ingen mistænkelige indikatorer\n");
    }

    if (!result.suspicious) {
      if (!destinationFolder) await ensureDestinationFolderInteractive();
      if (!destinationFolder) {
        lastEvent = {
          at: new Date().toISOString(),
          fileName,
          status: "error",
          message: t(locale, "err.noFolderPicked"),
        };
        addHistoryEntry({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          at: lastEvent.at,
          fileName,
          status: "error",
          message: lastEvent.message,
          hash: result.hash,
          sha1,
          contentType: result.contentType,
          vt,
          loadSimulation: result.loadSimulation,
          ...sourceMeta,
        });
        return;
      }

      try {
        const savedTo = await copyWithUniqueName(stagedFile, destinationFolder, fileName);
        await consumeSubscriptionUse();
        lastEvent = { at: new Date().toISOString(), fileName, status: "clean", message: t(locale, "ui.msgClean", { file: fileName }), savedTo };
        addHistoryEntry({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          at: lastEvent.at,
          fileName,
          status: "clean",
          message: t(locale, "ui.msgClean", { file: fileName }),
          savedTo,
          hash: result.hash,
          sha1,
          contentType: result.contentType,
          vt,
          loadSimulation: result.loadSimulation,
          ...sourceMeta,
        });
        notify(APP_DISPLAY_NAME, t(locale, "notify.cleanSaved", { file: fileName }));
        await resetSandboxDirs();
      } catch (err) {
        lastEvent = {
          at: new Date().toISOString(),
          fileName,
          status: "error",
          message: t(locale, "err.saveCleanFailed", { err: err?.message || String(err) }),
        };
        addHistoryEntry({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          at: lastEvent.at,
          fileName,
          status: "error",
          message: lastEvent.message,
          hash: result.hash,
          sha1,
          contentType: result.contentType,
          vt,
          loadSimulation: result.loadSimulation,
          ...sourceMeta,
        });
      }
    } else {
      lastEvent = { at: new Date().toISOString(), fileName, status: "virus", message: t(locale, "ui.msgVirus", { file: fileName }) };
      addHistoryEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: lastEvent.at,
        fileName,
        status: "virus",
        message: t(locale, "ui.msgVirus", { file: fileName }),
        score: result.score,
        reasons: result.reasons,
        hash: result.hash,
        sha1,
        contentType: result.contentType,
        vt,
        loadSimulation: result.loadSimulation,
        ...sourceMeta,
      });
      notify(APP_DISPLAY_NAME, t(locale, "notify.virusDetected", { file: fileName }));
      await resetSandboxDirs();
    }
  } finally {
    scanning = false;
    broadcastState();
  }
}

async function scanLocalJarReadOnly(sourcePath, locale, options = {}) {
  const skipVt = !!options.skipVt;
  const fileName = path.basename(sourcePath);
  const ext = getExtLower(fileName);
  if (ext !== ".jar") {
    sendLog(`[SKIMO] Springer over (ikke .jar): ${fileName}\n`);
    return;
  }

  const startedAt = new Date().toISOString();
  lastEvent = { at: startedAt, fileName, status: "scanning", message: t(locale, "tray.stateScanning") };
  broadcastState();

  const sandbox = getSandboxPaths();
  await resetSandboxDirs();
  await fs.mkdir(sandbox.input, { recursive: true });

  const sandboxInputFile = path.join(sandbox.input, fileName);
  await fs.copyFile(sourcePath, sandboxInputFile);

  scanning = true;
  broadcastState();

  try {
    sendLog(`[SKIMO] Batch-scan: ${fileName}\n`);
    await fs.mkdir(sandbox.quarantine, { recursive: true });
    await fs.mkdir(sandbox.stagingMods, { recursive: true });
    const quarantineFile = path.join(sandbox.quarantine, fileName);
    await safeMoveFile(sandboxInputFile, quarantineFile);
    const stagedFile = path.join(sandbox.stagingMods, fileName);
    await fs.copyFile(quarantineFile, stagedFile);

    const baseResult = await scanMinecraftJarStagedFile(stagedFile, fileName);
    const vt = !skipVt && baseResult?.hash ? await fetchVirusTotalVerdictForFile(baseResult.hash, stagedFile, fileName) : null;
    const result = {
      ...baseResult,
      reasons: Array.isArray(baseResult?.reasons) ? [...baseResult.reasons] : [],
      score: Number(baseResult?.score || 0),
      suspicious: false,
      vt,
    };
    mergeVirusTotalIntoResult(result, vt);
    const malVt = vt ? Number(vt.malicious || 0) : 0;
    result.suspicious = Number(result.score) >= SCAN_BLOCK_SCORE_THRESHOLD || malVt >= VT_MALICIOUS_BLOCK_MIN;
    const sha1 = result.hash ? sha1FileSync(stagedFile) : "";
    const sourceMeta = buildBatchScanSourceMeta(sourcePath);

    sendLog(`[SKIMO] SHA256: ${result.hash || "(ukendt)"}\n`);
    if (result.contentType) sendLog(`[SKIMO] Content type: ${result.contentType}\n`);
    if (vt) sendLog(`[SKIMO] VirusTotal: ${vt.malicious}/${vt.engines || 0} malicious (${vt.source || "report"})\n`);
    sendLog(`[SKIMO] Scan score: ${result.score}\n`);

    if (!result.suspicious) {
      lastEvent = {
        at: new Date().toISOString(),
        fileName,
        status: "clean",
        message: `${fileName}: OK (batch, original ikke flyttet)`,
      };
      addHistoryEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: lastEvent.at,
        fileName,
        status: "clean",
        message: lastEvent.message,
        hash: result.hash,
        sha1,
        contentType: result.contentType,
        vt,
        loadSimulation: result.loadSimulation,
        ...sourceMeta,
      });
    } else {
      lastEvent = {
        at: new Date().toISOString(),
        fileName,
        status: "virus",
        message: t(locale, "ui.msgVirus", { file: fileName }),
      };
      addHistoryEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: lastEvent.at,
        fileName,
        status: "virus",
        message: lastEvent.message,
        score: result.score,
        reasons: result.reasons,
        hash: result.hash,
        sha1,
        contentType: result.contentType,
        vt,
        loadSimulation: result.loadSimulation,
        ...sourceMeta,
      });
    }
  } catch (err) {
    const msg = err?.message || String(err);
    sendLog(`[SKIMO] Batch-scan fejl (${fileName}): ${msg}\n`);
    lastEvent = { at: new Date().toISOString(), fileName, status: "error", message: msg };
    addHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: lastEvent.at,
      fileName,
      status: "error",
      message: msg,
      source: "batch_folder",
      sourcePath,
    });
  } finally {
    await resetSandboxDirs();
    scanning = false;
    broadcastState();
  }
}

function queueScanFile(filePath) {
  if (!filePath || queuedPaths.has(filePath)) return;
  queuedPaths.add(filePath);
  scanQueue.push(filePath);
  pumpQueue().catch((err) => console.error("[SKIMO] queue pump error:", err?.message || err));
}

async function pumpQueue() {
  if (queuePumping) return;
  queuePumping = true;
  try {
    while (scanQueue.length > 0) {
      if (!activated || !protectionEnabled) break;
      if (scanning) break;

      const next = scanQueue.shift();
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
      }
    }
  } finally {
    queuePumping = false;
  }
}

function startDownloadsWatcher() {
  downloadsFolder = app.getPath("downloads");
  if (downloadsWatcher) return;

  try {
    downloadsWatcher = fssync.watch(downloadsFolder, { persistent: true }, (_eventType, filename) => {
      if (!activated || !protectionEnabled) return;
      if (!filename) return;
      if (!isLikelyMinecraftMod(filename)) return;
      if (isTempDownloadName(filename)) {
        markDownloading(filename);
        return;
      }
      const name = filename;
      // fs.watch får også events ved slet/rename; vent lidt og tjek at filen findes
      setTimeout(() => {
        try {
          if (!activated || !protectionEnabled) return;
          if (!isLikelyMinecraftMod(name)) return;
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
    width: 660,
    height: 760,
    resizable: true,
    minWidth: 620,
    minHeight: 620,
    show: false,
    backgroundColor: "#090e04",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
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
    app.dock?.hide();
  } catch {
    // ignore
  }
  broadcastState();
}

function ensureWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) return;

  const width = 182;
  const height = 48;
  const workArea = screen.getPrimaryDisplay().workArea;
  const x = workArea.x + 8; // venstre hjørne
  const y = workArea.y + 8;

  widgetWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: "#243038",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  widgetWindow.loadFile(path.join(__dirname, "minimized.html"));
  hardenWebContents(widgetWindow.webContents);
  widgetWindow.once("ready-to-show", () => {
    widgetWindow.show();
    broadcastState();
  });

  widgetWindow.on("blur", () => {
    try {
      widgetWindow.hide();
    } catch {
      // ignore
    }
  });

  widgetWindow.on("closed", () => {
    widgetWindow = null;
  });
}

function toggleWidgetWindow() {
  ensureWidgetWindow();
  if (!widgetWindow || widgetWindow.isDestroyed()) return;
  if (widgetWindow.isVisible()) widgetWindow.hide();
  else widgetWindow.show();
  broadcastState();
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
    tray.popUpContextMenu();
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

  // Reset in-memory state
  activated = false;
  activationInfo = { country: "", code: "" };
  subscriptionState = evaluateSubscriptionState(null);
  protectionEnabled = false;
  scanning = false;
  destinationFolder = "";
  history = [];
  lastEvent = null;

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

  forceQuitApp();
}

app.on("web-contents-created", (_event, contents) => {
  hardenWebContents(contents);
});

app.whenReady().then(async () => {
  ensureTray();
  downloadsFolder = app.getPath("downloads");
  currentInstallFingerprint = await computeInstallFingerprint();
  await loadState();
  await applyBundledModsDestination();
  await refreshSubscriptionStatusFromBilling();
  await loadHistory();

  await applyAutoMinecraftProbeEnvironment();

  applySubscriptionRuntimeState();
  if (activated && subscriptionState?.status === "active" && destinationFolder) {
    protectionEnabled = true;
    await saveState();
  }

  ensureMainWindow({ showOnReady: !activated });
  updateTrayMenu();
  broadcastState();
  startUpdateLoop();

  if (activated && protectionEnabled) startDownloadsWatcher();

  const scheduleBundledBatchScan = () => {
    setTimeout(() => {
      autoRunBundledModsBatchScan().catch((err) => {
        const msg = err?.message || String(err);
        sendLog(`[SKIMO] Auto batch-scan fejl: ${msg}\n`);
        console.error("[SKIMO] Auto batch-scan:", err);
      });
    }, 350);
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.once("did-finish-load", scheduleBundledBatchScan);
  } else {
    scheduleBundledBatchScan();
  }
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

ipcMain.handle("activate", async (_evt, { country, code, email }) => {
  const locale = localeFromCountry(country);
  const codeNorm = normalizeActivationCode(code);
  const emailNorm = normalizeEmail(email);
  const testProfile = getTestActivationProfile(emailNorm, codeNorm);
  if (!country) throw new Error(t(locale, "err.chooseCountry"));
  if (!codeNorm) throw new Error(t(locale, "err.enterCode"));
  if (!emailNorm) throw new Error(t(locale, "err.enterEmail"));
  if (!isValidEmail(emailNorm)) throw new Error(t(locale, "err.invalidEmail"));
  if (!testProfile && isKnownTestActivationCode(codeNorm)) throw new Error(t(locale, "err.wrongCode"));
  if (!isValidActivationCode(codeNorm)) throw new Error(t(locale, "err.wrongCode"));

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
    maxActivations: testProfile?.maxActivations || existing?.maxActivations || SUBSCRIPTION_MAX_ACTIVATIONS,
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

ipcMain.handle("pick-destination-folder", async () => {
  destinationFolder = "";
  await saveState();
  const picked = await ensureDestinationFolderInteractive();
  return picked || null;
});

ipcMain.handle("open-folder", async (_evt, which) => {
  if (which === "downloads") {
    await shell.openPath(app.getPath("downloads"));
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
    if (!isLikelyMinecraftMod(name)) continue;
    queueScanFile(path.join(dir, name));
  }
  return true;
});

ipcMain.handle("scan-mods-folder-batch-readonly", async () => {
  if (!activated) throw new Error(t(getLocale(), "err.activateFirst"));
  const locale = getLocale();
  ensureSubscriptionAllowsUse(locale);
  clearQueue();
  const bundled = getBundledSiblingModsFolder();
  let folder = "";
  if (bundled) {
    try {
      if (fssync.existsSync(bundled) && fssync.statSync(bundled).isDirectory()) {
        folder = bundled;
      }
    } catch {
      // ignore
    }
  }
  if (!folder) {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const picked = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Vælg mappe med .jar (fx Mods)",
    });
    if (picked.canceled || !picked.filePaths?.[0]) return { canceled: true, scanned: 0 };
    folder = picked.filePaths[0];
  }
  return runBatchScanFolderReadOnly(folder);
});

ipcMain.handle("clear-history", async () => {
  history = [];
  await saveHistory();
  broadcastState();
  return true;
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
    app.dock?.hide();
  } catch {
    // ignore
  }
  try {
    ensureWidgetWindow();
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      if (typeof widgetWindow.showInactive === "function") widgetWindow.showInactive();
      else widgetWindow.show();
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

function inferRedditMcCategory(title = "", body = "") {
  const hay = `${title} ${body}`.toLowerCase();
  if (/virus|malware|trojan|rat|stealer|njrat|miner/.test(hay)) return "virus";
  if (/warn|fake|scam|phishing|mirror|adware/.test(hay)) return "warn";
  if (/broken|crash|incompatible|outdated/.test(hay)) return "broken";
  if (/safe|verified|official|whitelist/.test(hay)) return "safe";
  if (/tip|guide|how to|tutorial|fabric|forge/.test(hay)) return "tips";
  return "chat";
}

ipcMain.handle("forum-fetch-reddit", async () => {
  const subs = ["feedthebeast", "ModdedMinecraft", "forge", "fabricmc"];
  const posts = [];
  for (const sub of subs) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=6`, {
        headers: { "User-Agent": "MinecraftModguard/1.0 (desktop)" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const child of data?.data?.children || []) {
        const d = child?.data;
        if (!d?.title) continue;
        posts.push({
          id: `reddit-${d.id}`,
          category: inferRedditMcCategory(d.title, d.selftext || ""),
          source: "reddit",
          origin: "web",
          subreddit: `r/${sub}`,
          author: d.author || sub,
          title: d.title,
          body: String(d.selftext || "").slice(0, 500),
          url: d.permalink ? `https://www.reddit.com${d.permalink}` : `https://www.reddit.com/r/${sub}/`,
          upvotes: d.ups || 0,
          comments: d.num_comments || 0,
          at: new Date((d.created_utc || 0) * 1000).toISOString(),
        });
      }
    } catch {
      // skip failed subreddit
    }
  }
  return { posts };
});

ipcMain.handle("open-url", async (_evt, url) => {
  const target = String(url || "").trim();
  if (!target || !/^https?:\/\//i.test(target)) return false;
  await shell.openExternal(target);
  return true;
});

ipcMain.handle("set-window-stage", async (_evt, stage) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const next = String(stage || "");
  if (next === "main") {
    mainWindow.setMinimumSize(1040, 700);
    mainWindow.setSize(1040, 700, true);
    mainWindow.center();
    return true;
  }
  if (next === "login" || next === "onboarding") {
    mainWindow.setMinimumSize(620, 620);
    mainWindow.setSize(660, 760, true);
    mainWindow.center();
    return true;
  }
  return false;
});
