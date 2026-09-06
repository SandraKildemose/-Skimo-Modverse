#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const simsRenderer = fs.readFileSync(
  path.join(root, "../Sims/app_asar_extracted/renderer.js"),
  "utf8"
);
const backup = fs.readFileSync(path.join(root, "app_asar_extracted/renderer.mc-backup.js"), "utf8");

const seedMatch = backup.match(
  /\/\/ =+\n\/\/  MINECRAFT MOD SEARCH[\s\S]*?function creepersAvatarSvg[\s\S]*?\n\}\n/
);
if (!seedMatch) throw new Error("Could not extract MC seed from backup");
const mcSeed = seedMatch[0];

let out = simsRenderer;

// Insert Minecraft catalog
out = out.replace(
  'const { localeFromCountry, t } = require("./i18n");\n',
  `const { localeFromCountry, t } = require("./i18n");\n\n${mcSeed}\n`
);

// Remove Sims catalog block
out = out.replace(/const SIMS_SEED_ITEMS = \[[\s\S]*?^}\)\);\n\nfunction setLocale/m, "function setLocale");

// Remove duplicate Sims MC_SEARCH_PLATFORMS block (keep seed block at top)
out = out.replace(
  /const CORE_PRODUCT_PRINCIPLES[\s\S]*?function isAllowedModSearchUrl[\s\S]*?\n\}\n\nfunction setLocale/,
  `const MODSEARCH_ALLOWED_HOSTS = new Set([
  "modrinth.com", "www.modrinth.com", "cdn.modrinth.com",
  "curseforge.com", "www.curseforge.com", "media.forgecdn.net",
  "planetminecraft.com", "www.planetminecraft.com",
  "optifine.net", "github.com", "raw.githubusercontent.com",
]);

function isAllowedModSearchUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || ""));
    return parsed.protocol === "https:" && MODSEARCH_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function setLocale`
);

// Use MC items everywhere Sims search catalog was referenced
out = out.split("SIMS_SEARCH_ITEMS").join("MC_SEED_ITEMS");
out = out.split("SIMS_SEARCH_PLATFORMS").join("MC_SEARCH_PLATFORMS");
out = out.split("simsSearchInput").join("mcSearchInput");
out = out.split("simsSearchBtn").join("mcSearchBtn");
out = out.split("simsSearchHints").join("mcSearchHints");
out = out.split("simsBrowserAddress").join("mcBrowserAddress");
out = out.split("simsBrowserScreen").join("mcBrowserScreen");
out = out.split("simsSearchIdlePanel").join("mcSearchIdlePanel");
out = out.split("simsFiltersSidebar").join("mcFiltersSidebar");
out = out.split("simsCategoryFilter").join("mcCategoryFilter");
out = out.split("simsTypeFilter").join("mcTypeFilter");
out = out.split("simsSortSelect").join("mcSortSelect");
out = out.split("simsPriceFilter").join("mcVersionFilter");
out = out.split("simsStarPicker").join("mcStarPicker");
out = out.split("simsResetFilters").join("mcResetFilters");
out = out.split("simsPlatformToggles").join("mcPlatformToggles");
out = out.split("simsLangFilter").join("mcLangFilter");
out = out.split("simsRatingFilter").join("mcRatingFilter");
out = out.split("simsTimeFilter").join("mcTimeFilter");
out = out.split("simsVersionFilter").join("mcGameVersionFilter");
out = out.split("simsGridListView").join("mcGridListView");
out = out.split("simsCurrentPage").join("mcCurrentPage");
out = out.split("simsHasSearched").join("mcHasSearched");
out = out.split("simsVisibleResults").join("mcVisibleResults");
out = out.split("simsSearchMode").join("mcSearchLoader");
out = out.split("lastSimsQuery").join("lastMcQuery");
out = out.split("activeSimsSources").join("activeMcSources");
out = out.split("renderSimsSearch").join("renderMcSearch");
out = out.split("renderSimsSearchIdle").join("renderMcSearchIdle");
out = out.split("renderSimsSearchSkeleton").join("renderMcSearchSkeleton");
out = out.split("normalizeSimsQuery").join("normalizeMcQuery");
out = out.split("scoreSimsItem").join("scoreMcItem");
out = out.split("getSimsResults").join("getMcResults");
out = out.split("inferSimsIntent").join("inferMcIntent");
out = out.split("displaySimsQuery").join("displayMcQuery");
out = out.split("updateSimsSearchHints").join("updateMcSearchHints");
out = out.split("renderSimsDockScans").join("renderMcDockScans");
out = out.split("simsThumbDataUrl").join("mcThumbDataUrl");
out = out.split("platformForItem").join("mcPlatformForItem");
out = out.split("modguard://sims/").join("modguard://minecraft/");
out = out.split("data-sims-mode").join("data-mc-loader");

// Expand MC_SEARCH_PLATFORMS for UI (trust, theme, badge)
out = out.replace(
  `const MC_SEARCH_PLATFORMS = [
  { key: "modrinth", name: "Modrinth", url: (q) => \`https://modrinth.com/mods?q=\${encodeURIComponent(q)}\` },
  { key: "curseforge", name: "CurseForge", url: (q) => \`https://www.curseforge.com/minecraft/mc-mods?search=\${encodeURIComponent(q)}\` },
  { key: "optifine", name: "OptiFine.net", url: () => "https://optifine.net/adloadx?f=OptiFine_HD_U_latest.jar" },
  { key: "planetminecraft", name: "PlanetMinecraft", url: (q) => \`https://www.planetminecraft.com/resources/mods/?keywords=\${encodeURIComponent(q)}\` },
];`,
  `const MC_SEARCH_PLATFORMS = [
  { key: "modrinth", name: "Modrinth", trust: "MC hub", note: "Fabric, Forge, NeoForge", badge: "Hub", theme: ["#9ae6b0", "#2f855a"], url: (q) => \`https://modrinth.com/mods?q=\${encodeURIComponent(q)}\` },
  { key: "curseforge", name: "CurseForge", trust: "Platform", note: "Modpacks og mods", badge: "CF", theme: ["#f5a623", "#7a4a10"], url: (q) => \`https://www.curseforge.com/minecraft/mc-mods?search=\${encodeURIComponent(q)}\` },
  { key: "planetminecraft", name: "PlanetMinecraft", trust: "Community", note: "Maps og mods", badge: "PMC", theme: ["#7dcc2a", "#3a7214"], url: (q) => \`https://www.planetminecraft.com/resources/mods/?keywords=\${encodeURIComponent(q)}\` },
  { key: "optifine", name: "OptiFine.net", trust: "Optimering", note: "Shaders og FPS", badge: "OF", theme: ["#44dfdf", "#1a3a4a"], url: () => "https://optifine.net/home" },
];`
);

// Login -> activate
out = out.replace(
  `await ipcRenderer.invoke("login", { country, email, password, remember: !!els.rememberMe?.checked });`,
  `await ipcRenderer.invoke("activate", {
      country: country || "denmark",
      email,
      code: els.code?.value || "",
    });`
);
out = out.replace(/const password = els\.code\?\.value \|\| "";\n\s*/g, "");
out = out.replace('setActivationMessage("Login ok")', 'setActivationMessage("Aktiveret")');

// Onboarding persistence
out = out.replace(
  "let onboardingRequired = true;",
  `let onboardingRequired = true;
try { if (localStorage.getItem("mc_modguard_onboarded") === "1") onboardingRequired = false; } catch {}`
);
out = out.replace(
  "onboardingRequired = false;",
  `onboardingRequired = false;
  try { localStorage.setItem("mc_modguard_onboarded", "1"); } catch {}`
);

// ONBOARDING slides Minecraft
out = out.replace(
  `const ONBOARDING_SLIDES = [
  ["Search visually", "Find Sims hair, CC, gameplay mods and build/buy items in one focused ModSearch."],
  ["Download safely", "Every file goes to sandbox first, then scan, then Mods folder only when clean."],
  ["Organize CC", "Related package files, overlays, addons and variants are grouped together."],
  ["Outdated detection", "Old duplicates and outdated mods can be opened directly in Finder for cleanup."],
  ["AI-powered accuracy", "ModGuard prioritizes correct category, verified previews and trust signals."],
  ["Visual browsing", "Browse like a modern mod manager with previews, sources, variants and safety status."],
];`,
  `const ONBOARDING_SLIDES = [
  ["Søg Minecraft mods", "Find mods fra Modrinth, CurseForge og PlanetMinecraft i ModSearch."],
  ["Download sikkert", "Sandbox, scan, derefter kun rene filer til mods-mappen."],
  ["Vælg mappe", "Vælg hvor ModGuard gemmer rene mods — samme flow som Sims."],
  ["Favoritter", "Markér mods med ♥ og find dem under Mine favoritter."],
  ["Outdatede mods", "Se mods der bør opdateres efter 30+ dage."],
  ["Minecraft-tema", "Grønt layout med community-forum kun for Minecraft."],
];`
);

// Local MC search — replace renderMcSearch function body via marker
const fnStart = out.indexOf("async function renderMcSearch(query, page = mcCurrentPage)");
if (fnStart < 0) throw new Error("renderMcSearch not found");
let depth = 0;
let fnEnd = -1;
for (let i = out.indexOf("{", fnStart); i < out.length; i++) {
  if (out[i] === "{") depth++;
  if (out[i] === "}") {
    depth--;
    if (depth === 0) {
      fnEnd = i + 1;
      break;
    }
  }
}

const mcSearchFn = `async function renderMcSearch(query, page = mcCurrentPage) {
  if (!mcBrowserScreen) return;
  const raw = String(query || "").trim();
  if (!raw) {
    renderMcSearchIdle();
    return;
  }
  mcHasSearched = true;
  lastMcQuery = raw;
  if (mcBrowserAddress) mcBrowserAddress.textContent = \`modguard://minecraft/search/\${displayMcQuery(raw)}/page/\${page}\`;
  renderMcSearchSkeleton();
  const items = getMcResultsLocal(raw);
  mcVisibleResults = items;
  if (!items.length) {
    mcBrowserScreen.innerHTML = '<div class="browser-empty search-idle-panel"><strong>Ingen resultater</strong><span class="search-idle-sub">Prøv et andet søgeord.</span></div>';
    return;
  }
  mcBrowserScreen.innerHTML = \`<div class="mod-grid">\${items.map((item) => renderMcModCard(item)).join("")}</div>\`;
}

function getMcResultsLocal(rawQuery) {
  const tokens = normalizeMcQuery(rawQuery).split(" ").filter((t) => t.length >= 2);
  const cat = document.getElementById("mcCategoryFilter")?.value || "all";
  const ver = document.getElementById("mcVersionFilter")?.value || "all";
  const loader = mcSearchLoader || "all";
  let items = MC_SEED_ITEMS.filter((item) => {
    if (cat !== "all" && item.category !== cat) return false;
    if (ver !== "all" && !String(item.minVersion || "").startsWith(ver)) return false;
    if (loader !== "all" && !(item.loaders || []).includes(loader)) return false;
    return true;
  });
  if (tokens.length) {
    items = items
      .map((item) => ({ item, score: scoreMcItemLocal(item, tokens) }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((e) => e.item);
  }
  return items;
}

function scoreMcItemLocal(item, tokens) {
  const hay = normalizeMcQuery(\`\${item.title} \${item.description} \${(item.tags || []).join(" ")}\`);
  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += token.length > 4 ? 3 : 2;
  }
  return score;
}

function normalizeMcQuery(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\\s+/g, " ").trim();
}

const FAVORITES_KEY = "mc_modguard_favorites";
function isMcFavorite(id) {
  try {
    const list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(list) && list.includes(id);
  } catch { return false; }
}
function toggleMcFavorite(id) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch {}
  if (!Array.isArray(list)) list = [];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch {}
}

function renderMcModCard(item) {
  const thumb = item.thumbUrl
    ? \`background-image:url('\${String(item.thumbUrl).replace(/'/g, "%27")}')\`
    : mcThumbDataUrl(item, lastMcQuery);
  const fav = isMcFavorite(item.id);
  return \`
    <article class="mod-card" data-open-mc-url="\${escapeHtml(item.url)}">
      <div class="mod-card-media" style="\${thumb};background-size:cover;background-position:center">
        <button type="button" class="mod-card-fav \${fav ? "is-fav" : ""}" data-mc-fav="\${escapeHtml(item.id)}">♥</button>
      </div>
      <div class="mod-card-body">
        <h3 class="mod-card-title">\${escapeHtml(item.title)}</h3>
        <div class="mod-card-meta"><span>\${escapeHtml(item.platform)}</span></div>
      </div>
    </article>\`;
}`;

out = out.slice(0, fnStart) + mcSearchFn + out.slice(fnEnd);

// Forum static
const forumStart = out.indexOf("async function renderForum()");
if (forumStart >= 0) {
  let d2 = 0;
  let forumEnd = -1;
  for (let i = out.indexOf("{", forumStart); i < out.length; i++) {
    if (out[i] === "{") d2++;
    if (out[i] === "}") {
      d2--;
      if (d2 === 0) {
        forumEnd = i + 1;
        break;
      }
    }
  }
  out =
    out.slice(0, forumStart) +
    `async function renderForum() {
  const feed = document.getElementById("forumFeed") || document.querySelector(".forum-feed");
  if (!feed) return;
  feed.innerHTML = (MC_FORUM_POSTS || []).map((post) => \`
    <article class="forum-post good" data-forum-url="\${escapeHtml(post.url || "")}">
      <div class="forum-post-head">
        <div style="margin-right:8px">\${creepersAvatarSvg(post.avatar || 0)}</div>
        <div>
          <h4>\${escapeHtml(post.title)}</h4>
          <div class="forum-post-meta">\${escapeHtml(post.sub)}</div>
        </div>
      </div>
      <div class="forum-tags">\${(post.tags || []).map((t) => \`<span class="forum-tag">\${escapeHtml(t)}</span>\`).join("")}</div>
    </article>\`).join("");
}` +
    out.slice(forumEnd);
}

// Stub unsupported IPC in render (moddb / ai index UI)
out = out.replace(/renderModdbStatus\([^)]*\)/g, "void 0");
out = out.replace(/renderAiIndexStatus\([^)]*\)/g, "void 0");

const outPath = path.join(root, "app_asar_extracted/renderer.js");
fs.writeFileSync(outPath, out);
console.log("Patched renderer:", outPath, out.length);
