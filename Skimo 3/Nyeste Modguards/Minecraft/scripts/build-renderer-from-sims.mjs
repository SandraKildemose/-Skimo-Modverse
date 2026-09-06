#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const simsRenderer = path.join(root, "../Sims/app_asar_extracted/renderer.js");
const mcSeedPath = path.join(root, "app_asar_extracted/mc-search-seed.js");
const outRenderer = path.join(root, "app_asar_extracted/renderer.js");

let src = fs.readFileSync(simsRenderer, "utf8");

// Element ID renames (match build-ui-from-sims.mjs)
const idMap = [
  ["simsSearchInput", "mcSearchInput"],
  ["simsSearchBtn", "mcSearchBtn"],
  ["simsSearchHints", "mcSearchHints"],
  ["simsBrowserAddress", "mcBrowserAddress"],
  ["simsBrowserScreen", "mcBrowserScreen"],
  ["simsSearchIdlePanel", "mcSearchIdlePanel"],
  ["simsFiltersSidebar", "mcFiltersSidebar"],
  ["simsCategoryFilter", "mcCategoryFilter"],
  ["simsTypeFilter", "mcTypeFilter"],
  ["simsSortSelect", "mcSortSelect"],
  ["simsPriceFilter", "mcVersionFilter"],
  ["simsStarPicker", "mcStarPicker"],
  ["simsResetFilters", "mcResetFilters"],
  ["simsPlatformToggles", "mcPlatformToggles"],
  ["simsLangFilter", "mcVersionFilter2"],
  ["simsRatingFilter", "mcRatingFilter"],
  ["simsTimeFilter", "mcTimeFilter"],
  ["simsVersionFilter", "mcGameVersionFilter"],
  ["simsGridListView", "mcGridListView"],
  ["simsCurrentPage", "mcCurrentPage"],
  ["simsHasSearched", "mcHasSearched"],
  ["simsVisibleResults", "mcVisibleResults"],
  ["simsSearchMode", "mcSearchLoader"],
  ["lastSimsQuery", "lastMcQuery"],
  ["activeSimsSources", "activeMcSources"],
  ["renderSimsSearch", "renderMcSearch"],
  ["renderSimsSearchIdle", "renderMcSearchIdle"],
  ["renderSimsSearchSkeleton", "renderMcSearchSkeleton"],
  ["normalizeSimsQuery", "normalizeMcQuery"],
  ["scoreSimsItem", "scoreMcItem"],
  ["getSimsResults", "getMcResults"],
  ["inferSimsIntent", "inferMcIntent"],
  ["itemMatchesIntent", "mcItemMatchesIntent"],
  ["displaySimsQuery", "displayMcQuery"],
  ["updateSimsSearchHints", "updateMcSearchHints"],
  ["renderSimsDockScans", "renderMcDockScans"],
  ["SIMS_SEARCH_PLATFORMS", "MC_SEARCH_PLATFORMS"],
  ["SIMS_SEARCH_ITEMS", "MC_SEED_ITEMS"],
  ["simsThumbDataUrl", "mcThumbDataUrl"],
  ["platformForItem", "mcPlatformForItem"],
  ["sims4Database", "mcDatabase"],
  ["moddb", "mcdb"],
  ["Moddb", "Mcdb"],
  ["moddb", "mcdb"],
];

for (const [a, b] of idMap) {
  src = src.split(a).join(b);
}

// Login -> activate (Minecraft main.js)
src = src.replace(
  /await ipcRenderer\.invoke\("login", \{ country, email, password, remember: !!els\.rememberMe\?\.checked \}\);/,
  `await ipcRenderer.invoke("activate", {
      country: els.country?.value || "denmark",
      email: els.email?.value || "",
      code: els.code?.value || "",
    });`
);
src = src.replace(/const password = els\.code\?\.value \|\| "";\s*/g, "");
src = src.replace(/setActivationMessage\("Login ok"\)/, 'setActivationMessage("Aktiveret")');

// Inject MC seed data + strip Sims-only IPC search at file start (after requires)
const seedBlock = fs.existsSync(mcSeedPath)
  ? fs.readFileSync(mcSeedPath, "utf8")
  : fs.readFileSync(path.join(root, "app_asar_extracted/renderer.js"), "utf8").match(
      /\/\/ =+[\s\S]*?const MC_FORUM_POSTS/
    )?.[0] || "";

const injectPoint = 'const { localeFromCountry, t } = require("./i18n");';
const mcBlock = `
// --- Minecraft ModSearch seed (local) ---
${seedBlock.includes("MC_MOD_SEED") ? seedBlock.split("const MC_FORUM_POSTS")[0] : ""}
`;

// Read current mc renderer for seed only
const oldMc = fs.readFileSync(path.join(root, "app_asar_extracted/renderer.js"), "utf8");
const seedExtract = oldMc.match(
  /\/\/ =+\n\/\/  MINECRAFT MOD SEARCH[\s\S]*?const MC_FORUM_POSTS = \[[\s\S]*?\];/
)?.[0];
const forumExtract = oldMc.match(/const MC_FORUM_POSTS = \[[\s\S]*?\];/)?.[0];
const avatarFn = oldMc.match(/function creepersAvatarSvg[\s\S]*?\n\}/)?.[0];

if (seedExtract && forumExtract) {
  src = src.replace(
    injectPoint,
    `${injectPoint}\n${seedExtract}\n${forumExtract}\n${avatarFn || ""}\n`
  );
}

// Replace async renderMcSearch body: use local getMcResults instead of ipc modsearch-search
src = src.replace(
  /async function renderMcSearch\(query, page = mcCurrentPage\) \{[\s\S]*?^}/m,
  `async function renderMcSearch(query, page = mcCurrentPage) {
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
  const items = getMcResults(raw);
  mcVisibleResults = items;
  if (!items.length) {
    mcBrowserScreen.innerHTML = \`<div class="browser-empty search-idle-panel"><strong>Ingen resultater</strong><span class="search-idle-sub">Prøv et andet søgeord.</span></div>\`;
    return;
  }
  const gridClass = "mod-grid";
  mcBrowserScreen.innerHTML = \`<div class="\${gridClass}">\${items.map((item) => renderMcModCard(item)).join("")}</div>\`;
}

function renderMcModCard(item) {
  const thumb = item.thumbUrl
    ? \`background-image:url('\${String(item.thumbUrl).replace(/'/g, "%27")}')\`
    : mcThumbDataUrl(item, lastMcQuery);
  const fav = isMcFavorite(item.id);
  return \`
    <article class="mod-card" data-mc-mod-url="\${escapeHtml(item.url)}" data-mc-id="\${escapeHtml(item.id)}">
      <div class="mod-card-media" style="\${thumb};background-size:cover;background-position:center">
        <button type="button" class="mod-card-fav \${fav ? "is-fav" : ""}" data-mc-fav="\${escapeHtml(item.id)}">♥</button>
      </div>
      <div class="mod-card-body">
        <h3 class="mod-card-title">\${escapeHtml(item.title)}</h3>
        <div class="mod-card-meta">
          <span>\${escapeHtml(item.platform)}</span>
          <span>\${escapeHtml((item.loaders || []).join(", "))}</span>
          <span>\${escapeHtml(item.minVersion || "")}+</span>
        </div>
      </div>
    </article>\`;
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

function getMcResults(rawQuery) {
  const tokens = normalizeMcQuery(rawQuery).split(" ").filter((t) => t.length >= 2);
  const cat = mcCategoryFilter?.value || "all";
  const ver = mcVersionFilter?.value || "all";
  const loader = mcSearchLoader || "all";
  let items = MC_SEED_ITEMS.filter((item) => {
    if (cat !== "all" && item.category !== cat) return false;
    if (ver !== "all" && !String(item.minVersion || "").startsWith(ver)) return false;
    if (loader !== "all" && !(item.loaders || []).includes(loader)) return false;
    return true;
  });
  if (tokens.length) {
    items = items
      .map((item) => ({ item, score: scoreMcItem(item, tokens) }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((e) => e.item);
  }
  return items;
}

function scoreMcItem(item, tokens) {
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

function displayMcQuery(q) {
  return encodeURIComponent(String(q || "").trim());
}`
);

// Forum: static MC posts instead of reddit fetch
src = src.replace(
  /async function renderForum\(\) \{[\s\S]*?^}/m,
  `async function renderForum() {
  const feed = document.getElementById("forumFeed") || document.querySelector(".forum-feed");
  if (!feed) return;
  feed.innerHTML = (MC_FORUM_POSTS || []).map((post) => \`
    <article class="forum-post good forum-card" data-forum-url="\${escapeHtml(post.url || "")}">
      <div class="forum-post-head">
        <div>\${creepersAvatarSvg(post.avatar || 0)}</div>
        <div>
          <h4>\${escapeHtml(post.title)}</h4>
          <div class="forum-post-meta">\${escapeHtml(post.sub)}</div>
        </div>
      </div>
      <div class="forum-tags">\${(post.tags || []).map((t) => \`<span class="forum-tag">\${escapeHtml(t)}</span>\`).join("")}</div>
    </article>\`).join("");
}`
);

// Disable AI/moddb buttons
src = src.replace(/ipcRenderer\.invoke\("start-ai-indexing"\)/g, "Promise.resolve()");
src = src.replace(/ipcRenderer\.invoke\("moddb-start-index"\)/g, "Promise.resolve()");
src = src.replace(/ipcRenderer\.invoke\("modsearch-expand-hub"[\s\S]*?\)\)/g, "null");
src = src.replace(/ipcRenderer\.invoke\("modsearch-fetch-preview"[\s\S]*?\)\)/g, "null");
src = src.replace(/ipcRenderer\.invoke\("modsearch-enrich-batch"[\s\S]*?\)\)/g, "{ items: mcVisibleResults }");

// Onboarding storage key
src = src.replace(/skimo_onboarding/g, "mc_modguard_onboarding");
src = src.replace(/onboardingRequired = true/g, "onboardingRequired = !localStorage.getItem('mc_modguard_onboarded')");

// MC loader mode toggles
src = src.replace(
  /data-sims-mode/g,
  "data-mc-loader"
);

fs.writeFileSync(outRenderer, src);
console.log("Wrote", outRenderer, src.length, "bytes");
