#!/usr/bin/env node
/**
 * Builds Minecraft Modguard index.html from Sims Modguard (identical structure, MC theme).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const simsIndex = path.join(root, "../Sims/app_asar_extracted/index.html");
const outIndex = path.join(root, "app_asar_extracted/index.html");
const assetsDir = path.join(root, "app_asar_extracted/assets");
const videoSrc = path.join(root, "../../Dashboard/Videoer/Minecraft.mp4");
const videoDst = path.join(assetsDir, "Minecraft.mp4");
const resVideo = path.join(root, "Minecraft Modverse.app/Contents/Resources/Minecraft.mp4");

let html = fs.readFileSync(simsIndex, "utf8");

const colorMap = [
  ["#7b42f5", "#5aa320"],
  ["#7b59ff", "#6cbc28"],
  ["#8b5cf6", "#7dcc2a"],
  ["#6d35d9", "#4a8a18"],
  ["#7c48ef", "#5aa320"],
  ["#8d5cf6", "#7dcc2a"],
  ["#b8a0ff", "#9ee050"],
  ["#d8b4fe", "#c8f090"],
  ["#5a2fc7", "#3a7214"],
  ["#123, 66, 245", "90, 163, 32"],
  ["123, 89, 255", "90, 163, 32"],
  ["141, 92, 246", "90, 163, 32"],
  ["#2f7184", "#3a8010"],
  ["#245b6b", "#2d6010"],
  ["#eef7fb", "#1a2510"],
  ["#f7fcff", "#0e1408"],
  ["#d9eef6", "#1a2510"],
  ["#162831", "#e8f5d8"],
  ["#4e6470", "#9eba7e"],
];

for (const [from, to] of colorMap) {
  html = html.split(from).join(to);
}

html = html
  .replace(/<title>Sims Modguard<\/title>/, "<title>Minecraft Modguard</title>")
  .replace(/Sims Modguard/g, "Minecraft Modguard")
  .replace(/Sims ModGuard/g, "Minecraft ModGuard")
  .replace(/assets\/Sims\.mp4/g, "assets/Minecraft.mp4")
  .replace(
    /Premium Sims CC protection and discovery\./,
    "Premium Minecraft mod protection and discovery."
  )
  .replace(
    /Find, preview, download and scan Sims mods safely in one visual launcher\./,
    "Find, preview, download and scan Minecraft mods safely in one visual launcher."
  )
  .replace(
    /Tilpas ModGuard til dine behov og hold din Sims 4 oplevelse sikker\./,
    "Tilpas ModGuard til dine behov og hold din Minecraft-oplevelse sikker."
  )
  .replace(/Sims 4 \(Alle\)/g, "Minecraft (Alle)")
  .replace(/modguard:\/\/sims\//g, "modguard://minecraft/")
  .replace(
    /<div class="search-mode" role="group" aria-label="Filtrer søgning">[\s\S]*?<\/div>/,
    `<div class="search-mode mc-loader-modes" role="group" aria-label="Loader">
                  <button class="mode-toggle active" type="button" data-mc-loader="all">Alle</button>
                  <button class="mode-toggle" type="button" data-mc-loader="fabric">Fabric</button>
                  <button class="mode-toggle" type="button" data-mc-loader="forge">Forge</button>
                  <button class="mode-toggle" type="button" data-mc-loader="neoforge">NeoForge</button>
                  <button class="mode-toggle" type="button" data-mc-loader="quilt">Quilt</button>
                </div>`
  )
  .replace(
    /<strong>Søg efter Sims CC og mods<\/strong>/,
    "<strong>Søg efter Minecraft mods</strong>"
  )
  .replace(
    /Skriv et søgeord og tryk Søg — CC finder også mods og gameplay\./,
    "Skriv et søgeord og tryk Søg — Modrinth, CurseForge og PlanetMinecraft."
  )
  .replace(
    /<option value="cc">CC<\/option>\s*<option value="mods">Mods<\/option>\s*<option value="gameplay">Gameplay<\/option>\s*<option value="buildbuy">Build\/Buy<\/option>/,
    `<option value="optimization">Optimization</option>
                    <option value="adventure">Adventure</option>
                    <option value="magic">Magic</option>
                    <option value="technology">Technology</option>
                    <option value="utility">Utility</option>
                    <option value="world">World</option>
                    <option value="shader">Shader</option>`
  )
  .replace(
    /<option value="hair">Hair<\/option>[\s\S]*?<option value="gameplay">Gameplay<\/option>/,
    `<option value="fabric">Fabric</option>
                    <option value="forge">Forge</option>
                    <option value="neoforge">NeoForge</option>
                    <option value="shader">Shader</option>`
  )
  .replace(/id="simsSearchInput"/g, 'id="mcSearchInput"')
  .replace(/id="simsSearchBtn"/g, 'id="mcSearchBtn"')
  .replace(/id="simsSearchHints"/g, 'id="mcSearchHints"')
  .replace(/id="simsBrowserAddress"/g, 'id="mcBrowserAddress"')
  .replace(/id="simsBrowserScreen"/g, 'id="mcBrowserScreen"')
  .replace(/id="simsSearchIdlePanel"/g, 'id="mcSearchIdlePanel"')
  .replace(/id="simsFiltersSidebar"/g, 'id="mcFiltersSidebar"')
  .replace(/id="simsCategoryFilter"/g, 'id="mcCategoryFilter"')
  .replace(/id="simsTypeFilter"/g, 'id="mcTypeFilter"')
  .replace(/id="simsSortSelect"/g, 'id="mcSortSelect"')
  .replace(/id="simsPriceFilter"/g, 'id="mcVersionFilter"')
  .replace(/id="simsStarPicker"/g, 'id="mcStarPicker"')
  .replace(/id="simsResetFilters"/g, 'id="mcResetFilters"')
  .replace(/id="simsPlatformToggles"/g, 'id="mcPlatformToggles"')
  .replace(/for="simsLangFilter"/g, 'for="mcVersionFilter2" hidden')
  .replace(/id="simsLangFilter"/g, 'id="mcVersionFilter2" hidden')
  .replace(
    /Forum viser trends fra r\/TheSims4Mods og r\/Sims4\./,
    "Forum viser Minecraft-community fra Modrinth, CurseForge og Reddit."
  )
  .replace(
    /<span>🛡<\/span><span>Minecraft Modguard<\/span>/,
    `<span class="nav-logo-mc" aria-hidden="true">⛏</span><span>Minecraft Modguard</span>`
  );

// Minecraft pixel font + green chrome overrides
const mcTheme = `
      @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
      :root {
        --accent: #5aa320 !important;
        --accent-strong: #3a7214 !important;
        --bg: #1a2510 !important;
        --surface: #22301a !important;
        --chrome-deep: #090e04 !important;
      }
      body, .wrap.dashboard-mode { font-family: -apple-system, system-ui, Arial, sans-serif; }
      .dashboard-nav-brand, .hub-title, .login-logo { font-family: 'VT323', monospace !important; }
      .login-logo {
        background: linear-gradient(180deg, #7dcc2a, #3a7214) !important;
        border-radius: 4px !important;
        box-shadow: 0 4px 0 rgba(0,0,0,0.35) !important;
      }
      .nav-logo-mc {
        width: 34px; height: 34px; border-radius: 4px;
        display: inline-flex; align-items: center; justify-content: center;
        background: linear-gradient(180deg, #7dcc2a, #3a7214);
        border: 2px solid #3a6018;
        font-size: 18px;
        box-shadow: 0 3px 0 rgba(0,0,0,0.35);
      }
      .activation-video::after {
        background:
          radial-gradient(circle at 50% 40%, rgba(90, 163, 32, 0.18), transparent 38%),
          rgba(5, 12, 4, 0.48) !important;
      }
      .dashboard-nav-item.active {
        background: linear-gradient(180deg, rgba(125, 204, 42, 0.35), rgba(58, 114, 20, 0.55)) !important;
      }
      .card.dashboard-mode { background: #0b0f08 !important; }
      .wrap.dashboard-mode { background: #090e04 !important; }
`;

html = html.replace("</style>", `${mcTheme}\n    </style>`);

// Hide Sims-only panels MC main does not support
html = html.replace(
  /<div class="moddb-status-bar[\s\S]*?<\/div>\s*<button class="filter-reset"/,
  '<button class="filter-reset"'
);

fs.mkdirSync(assetsDir, { recursive: true });
if (fs.existsSync(videoSrc)) {
  fs.copyFileSync(videoSrc, videoDst);
  fs.copyFileSync(videoSrc, resVideo);
  console.log("Copied Minecraft.mp4 to assets + Resources");
} else {
  console.warn("Warning: Videoer/Minecraft.mp4 not found at", videoSrc);
}

fs.writeFileSync(outIndex, html);
console.log("Wrote", outIndex, "(" + html.length + " bytes)");
