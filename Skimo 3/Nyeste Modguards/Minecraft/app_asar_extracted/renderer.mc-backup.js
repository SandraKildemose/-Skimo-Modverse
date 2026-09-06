const { ipcRenderer } = require("electron");
const { localeFromCountry, t } = require("./i18n");

// ============================================================
//  DOM REFS
// ============================================================
const els = {
  appWrap: document.getElementById("appWrap"),
  mainCard: document.getElementById("mainCard"),
  appReleaseLine: document.getElementById("appReleaseLine"),
  activationView: document.getElementById("activationView"),
  onboardingView: document.getElementById("onboardingView"),
  onboardSlides: document.getElementById("onboardSlides"),
  onboardDots: document.getElementById("onboardDots"),
  onboardBackBtn: document.getElementById("onboardBackBtn"),
  onboardNextBtn: document.getElementById("onboardNextBtn"),
  onboardReadyBtn: document.getElementById("onboardReadyBtn"),
  dashboardView: document.getElementById("dashboardView"),

  country: document.getElementById("country"),
  email: document.getElementById("email"),
  code: document.getElementById("code"),
  activateBtn: document.getElementById("activateBtn"),
  minimizeBtnA: document.getElementById("minimizeBtnA"),
  activationMessage: document.getElementById("activationMessage"),
  renewalPanel: document.getElementById("renewalPanel"),
  renewalTitle: document.getElementById("renewalTitle"),
  renewalBody: document.getElementById("renewalBody"),
  renewalMeta: document.getElementById("renewalMeta"),
  renewalUses: document.getElementById("renewalUses"),
  renewalExpiry: document.getElementById("renewalExpiry"),
  renewalStatus: document.getElementById("renewalStatus"),
  renewalQr: document.getElementById("renewalQr"),
  openRenewalBtn: document.getElementById("openRenewalBtn"),

  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  toggleBtn: document.getElementById("toggleBtn"),
  minimizeBtn: document.getElementById("minimizeBtn"),

  downloadsPath: document.getElementById("downloadsPath"),
  openDownloadsBtn: document.getElementById("openDownloadsBtn"),

  destinationPath: document.getElementById("destinationPath"),
  pickDestinationBtn: document.getElementById("pickDestinationBtn"),
  openDestinationBtn: document.getElementById("openDestinationBtn"),

  scanNowBtn: document.getElementById("scanNowBtn"),
  batchScanModsBtn: document.getElementById("batchScanModsBtn"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),

  message: document.getElementById("message"),
  statCleanCount: document.getElementById("statCleanCount"),
  statVirusCount: document.getElementById("statVirusCount"),
  statOutdatedCount: document.getElementById("statOutdatedCount"),
  statSitesCount: document.getElementById("statSitesCount"),
  cleanModsList: document.getElementById("cleanModsList"),
  cleanModsCount: document.getElementById("cleanModsCount"),
  blockedModsList: document.getElementById("blockedModsList"),
  blockedModsCount: document.getElementById("blockedModsCount"),
  outdatedModsList: document.getElementById("outdatedModsList"),
  outdatedModsCount: document.getElementById("outdatedModsCount"),
  websiteList: document.getElementById("websiteList"),
  websitesCount: document.getElementById("websitesCount"),
  historyList: document.getElementById("historyList"),
  historyCount: document.getElementById("historyCount"),
  historyCountInner: document.getElementById("historyCountInner"),
  log: document.getElementById("log"),
};

let state = null;
let currentLocale = "da";
let forcedLocale = null;
let onboardingIndex = 0;
let onboardingRequired = true;
let mcForumFilter = "all";

const FLAG_TO_COUNTRY = { da: "denmark", sv: "sweden", no: "norway", en: "usa", fr: "france" };
const COUNTRY_TO_FLAG = { denmark: "da", sweden: "sv", norway: "no", usa: "en", uk: "en", france: "fr" };

const langFlagButtons = Array.from(document.querySelectorAll(".lang-flag"));
const scrollLinks = Array.from(document.querySelectorAll("[data-scroll-target]"));

// ============================================================
//  MINECRAFT MOD SEARCH DATA
// ============================================================

// [category, title, platform, description, tags, platformKey, loaders, minVersion, thumbUrl, downloads]
const MC_MOD_SEED = [
  ["optimization","Sodium","Modrinth","Render-optimeringsMod til Fabric. Øger FPS dramatisk og bruger moderne OpenGL-teknikker.","sodium fps fabric performance render opengl","modrinth","fabric","1.21","https://cdn.modrinth.com/data/AANobbMI/icon.png",10_500_000],
  ["optimization","Iris Shaders","Modrinth","Shader-pakke til Fabric/Sodium — kompatibel med OptiFine shaders.","iris shaders fabric sodium graphics beautiful visual","modrinth","fabric","1.21","https://cdn.modrinth.com/data/YL57xq9U/icon.png",8_200_000],
  ["optimization","OptiFine","OptiFine.net","Den klassiske optimeringsMod. HD teksturer, shader-support og bedre FPS.","optifine shaders fps hd textures forge classic","optifine","forge","1.20","",50_000_000],
  ["optimization","Lithium","Modrinth","Serverside ydeevneoptimering til Fabric — markant bedre TPS.","lithium server optimization tps performance fabric","modrinth","fabric","1.21","https://cdn.modrinth.com/data/gvQqBUqZ/icon.png",6_800_000],
  ["optimization","FerriteCore","Modrinth","Mindsker Minecrafts RAM-brug markant — vigtigt til modpacks.","ferritecore memory ram optimization performance modpack","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/uXXizFIs/icon.png",4_200_000],
  ["utility","JEI - Just Enough Items","CurseForge","Vis opskrifter og ingredienser for alle items. Essentiel mod til modpacks.","jei just enough items recipes crafting ingredients ui","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/291/402/637326387890069658.png",32_000_000],
  ["utility","AppleSkin","Modrinth","Viser detaljeret madinfo: mæthed, saturation, effekter og mere i HUD.","appleskin food hunger saturation hud ui display","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/EsAfCjCV/icon.png",5_400_000],
  ["utility","Xaero's Minimap","CurseForge","Minimap i hjørnet af skærmen med waypoints, cave view og death markers.","xaero minimap waypoints navigation hud map cave","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/31/768/636350540498680013.png",36_000_000],
  ["utility","Journeymap","CurseForge","Fuld-skærms interaktivt verdenskort med waypoints, teleport og real-time tracking.","journeymap fullscreen map waypoints navigation teleport realtime","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/31/817/636350597538709380.png",42_000_000],
  ["utility","Mod Menu","Modrinth","Tilføjer en mod-liste-menu til Fabric — se alle installerede mods.","modmenu mod list fabric ui installed version","modrinth","fabric","1.21","https://cdn.modrinth.com/data/mOgUt4GM/icon.png",9_100_000],
  ["utility","Waystones","CurseForge","Teleportér til waystone-blokke rundt i verden — perfekt til survival.","waystones teleport fast travel utility survival waypoint","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/276/484/637266374920726827.png",22_000_000],
  ["utility","Simple Voice Chat","Modrinth","Proximity voice chat direkte i Minecraft multiplayer.","voice chat proximity multiplayer communication server","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/9eGKb6K1/icon.png",5_800_000],
  ["world","Biomes O' Plenty","CurseForge","Tilføjer 80+ nye biomer med unik flora, fauna og terræn.","biomes bop worldgen terrain new biomes flora fauna","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/35/241/636363397990388775.png",26_000_000],
  ["world","Terralith","Modrinth","Redesigner verdensgenerering med spektakulære biomer og landformer.","terralith terrain worldgen biomes generation overworld","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/8oi3bsk5/icon.png",7_600_000],
  ["world","Oh The Biomes You'll Go","Modrinth","Tilføjer over 80 smukke biomer til overworld, nether og end.","byg biomes overworld nether end worldgen exploration","modrinth","fabric,forge","1.20","https://cdn.modrinth.com/data/bopmByMi/icon.png",3_200_000],
  ["magic","Botania","CurseForge","Naturmagi-mod med blomster, mana og fantastiske crafting-muligheder.","botania magic mana flowers botanical crafting nature","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/76/613/636596516793834065.png",16_000_000],
  ["magic","Twilight Forest","CurseForge","En komplet dimensionsmod: skove, bosser, dungeons og progression.","twilight forest dimension adventure magic boss dungeon progression","curseforge","forge,fabric","1.20","https://media.forgecdn.net/avatars/5/21/635265874014582082.png",21_000_000],
  ["magic","Ars Nouveau","Modrinth","Byg dine egne trylleformularer med et modulært trylleformularsystem.","ars nouveau magic spells custom spellbook arcane glyphs","modrinth","forge,fabric","1.20","https://cdn.modrinth.com/data/wouPaXGn/icon.png",2_800_000],
  ["technology","Create","Modrinth","Industrimod med roterende maskiner, gear, conveyor belts og damp.","create technology machines steam gears factory engineering contraption","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/LNytGWDc/icon.png",22_000_000],
  ["technology","Mekanism","CurseForge","Avanceret teknologimod med generators, factories og ressourceforarbejdning.","mekanism technology machines power energy ore processing nuclear","curseforge","forge","1.20","https://media.forgecdn.net/avatars/83/643/636643459403897139.png",19_000_000],
  ["technology","Thermal Expansion","CurseForge","Klassisk teknologimod med maskiner, RF-energi og processing.","thermal expansion technology machines rf energy processing classic","curseforge","forge","1.20","https://media.forgecdn.net/avatars/47/660/636442073580116974.png",16_000_000],
  ["adventure","Alex's Mobs","Modrinth","Tilføjer 85+ nye dyr, monstre og skabninger til verden.","alexs mobs animals creatures monsters wildlife adventure","modrinth","forge","1.21","https://cdn.modrinth.com/data/wssFqCzi/icon.png",13_000_000],
  ["adventure","Ice and Fire: Dragons","CurseForge","Tilføjer drager, sea serpents og andre mytologiske skabninger.","ice fire dragons mythical creatures fantasy adventure sea serpent","curseforge","forge,fabric","1.20","https://media.forgecdn.net/avatars/151/150/636812022985710060.png",23_000_000],
  ["adventure","Origins","Modrinth","Vælg en oprindelse med unikke evner og ulemper ved gamestart.","origins rpg abilities powers classes character passives","modrinth","fabric","1.21","https://cdn.modrinth.com/data/OriginsMod/icon.png",9_500_000],
  ["adventure","Dungeons & Taverns","Modrinth","Strukturgenerator: nye dungeons, taverner, landeveje og landsbyer.","dungeons taverns structures adventure exploration worldgen village","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/tpehi7ww/icon.png",3_500_000],
  ["decoration","Farmer's Delight","Modrinth","Mad, afgrøder, knive og køkkenblokke — et komplet madlavningssystem.","farmers delight food farming cooking crops kitchen mod","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/R2OftAxM/icon.png",11_000_000],
  ["decoration","Macaw's Furniture","CurseForge","Hundredvis af dekorative møbler til dit hjem.","macaw furniture decoration building interior design home","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/358/948/637610099527611090.png",8_500_000],
  ["shader","Complementary Shaders","CurseForge","Smuk og optimeret shader der fungerer med Iris og OptiFine.","complementary shaders beautiful graphics lighting realistic","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/488/396/638012898735481978.png",4_100_000],
];

const MC_SEARCH_PLATFORMS = [
  { key: "modrinth", name: "Modrinth", url: (q) => `https://modrinth.com/mods?q=${encodeURIComponent(q)}` },
  { key: "curseforge", name: "CurseForge", url: (q) => `https://www.curseforge.com/minecraft/mc-mods?search=${encodeURIComponent(q)}` },
  { key: "optifine", name: "OptiFine.net", url: () => "https://optifine.net/adloadx?f=OptiFine_HD_U_latest.jar" },
  { key: "planetminecraft", name: "PlanetMinecraft", url: (q) => `https://www.planetminecraft.com/resources/mods/?keywords=${encodeURIComponent(q)}` },
];

const MC_SEED_ITEMS = MC_MOD_SEED.map(([category, title, platform, description, tags, platformKey, loaders, minVersion, thumbUrl, downloads], idx) => ({
  id: `mc-seed-${idx}`,
  category,
  title,
  platform,
  description,
  tags: tags.split(" "),
  platformKey,
  loaders: loaders.split(","),
  minVersion,
  thumbUrl,
  downloads: Number(downloads) || 0,
  rating: Number((3.8 + ((idx % 12) / 10)).toFixed(1)),
  url: MC_SEARCH_PLATFORMS.find(p => p.key === platformKey)?.url(title) || `https://modrinth.com/mods?q=${encodeURIComponent(title)}`,
}));

// ============================================================
//  FORUM POSTS
// ============================================================

function creepersAvatarSvg(seed) {
  const avatars = [
    // Creeper
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#41a247"/><rect x="1" y="2" width="2" height="2" fill="#1a1a1a"/><rect x="5" y="2" width="2" height="2" fill="#1a1a1a"/><rect x="2" y="5" width="4" height="1" fill="#1a1a1a"/><rect x="2" y="4" width="1" height="1" fill="#1a1a1a"/><rect x="5" y="4" width="1" height="1" fill="#1a1a1a"/></svg>`,
    // Steve
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#c8804a"/><rect x="1" y="2" width="2" height="2" fill="#3a5a8a"/><rect x="5" y="2" width="2" height="2" fill="#3a5a8a"/><rect x="2" y="5" width="4" height="1" fill="#7a3030"/><rect x="0" y="0" width="8" height="2" fill="#7a4520"/></svg>`,
    // Skeleton
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#d8d8c8"/><rect x="1" y="1" width="2" height="2" fill="#1a1a1a"/><rect x="5" y="1" width="2" height="2" fill="#1a1a1a"/><rect x="2" y="5" width="1" height="2" fill="#b8b8a8"/><rect x="4" y="5" width="2" height="2" fill="#b8b8a8"/><rect x="2" y="4" width="4" height="1" fill="#1a1a1a"/></svg>`,
    // Diamond
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#1a3a4a"/><rect x="2" y="1" width="4" height="1" fill="#44dfdf"/><rect x="1" y="2" width="6" height="3" fill="#44dfdf"/><rect x="2" y="5" width="4" height="1" fill="#44dfdf"/><rect x="3" y="6" width="2" height="1" fill="#2ababa"/><rect x="1" y="2" width="1" height="1" fill="#7fffff"/></svg>`,
    // TNT
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#c03030"/><rect x="0" y="2" width="8" height="1" fill="#e8e8e8"/><rect x="0" y="5" width="8" height="1" fill="#e8e8e8"/><rect x="1" y="3" width="6" height="2" fill="#e8e8e8"/><rect x="2" y="3" width="1" height="2" fill="#c03030"/><rect x="5" y="3" width="1" height="2" fill="#c03030"/></svg>`,
  ];
  return avatars[seed % avatars.length];
}

const MC_FORUM_POSTS = [
  { title: "Sodium 0.6.0 udgivet — 40% bedre FPS på 1.21.4!", sub: "Modrinth · jellysquid3 · 2 timer siden", tags: ["Sodium","Fabric","Performance"], votes: 1247, replies: 312, avatar: 0, url: "https://modrinth.com/mod/sodium" },
  { title: "Create Mod 0.5.1 — ny stationær dampmotor og forbedret contraption-fysik", sub: "r/feedthebeast · simibubi · 5 timer siden", tags: ["Create","Forge","Fabric","Technology"], votes: 893, replies: 187, avatar: 1, url: "https://modrinth.com/mod/create-fabric" },
  { title: "Advarsel: falsk 'Optifine 1.21.5.jar' spredt via Discord — indeholder RAT", sub: "r/Minecraft · u/SecModder · 1 dag siden", tags: ["Sikkerhed","Malware","Advarsel"], votes: 4211, replies: 643, avatar: 2, url: "https://www.reddit.com/r/Minecraft" },
  { title: "Bedste optimerings-modpack til Fabric 1.21 — min liste (Sodium+Iris+Lithium)", sub: "PlanetMinecraft · CreatorPro · 3 dage siden", tags: ["Optimization","Modpack","Fabric","Guide"], votes: 562, replies: 98, avatar: 3, url: "https://www.planetminecraft.com" },
  { title: "Alex's Mobs 1.24 — 6 nye skabninger inkl. giant squid og thunderbird", sub: "CurseForge · Alex_Mod · 1 dag siden", tags: ["Alex's Mobs","Adventure","Creatures"], votes: 728, replies: 145, avatar: 0, url: "https://www.curseforge.com/minecraft/mc-mods/alexs-mobs" },
  { title: "NeoForge 21.4 er klar — hurtigere modloading og forbedret API", sub: "neoforged.net · neoforged team · 4 timer siden", tags: ["NeoForge","Loader","Update"], votes: 1089, replies: 256, avatar: 1, url: "https://neoforged.net" },
  { title: "Terralith + Biomes O' Plenty kompatibilitetspatch — nu fungerer de sammen!", sub: "Modrinth · Stardust Labs · 6 timer siden", tags: ["Terralith","BOP","Worldgen","Compat"], votes: 445, replies: 89, avatar: 4, url: "https://modrinth.com/mod/terralith" },
  { title: "Scan altid dine mods med Minecraft ModGuard inden install", sub: "SpigotMC · Admin-tip · 2 dage siden", tags: ["Sikkerhed","ModGuard","Guide"], votes: 334, replies: 67, avatar: 3, url: "https://spigotmc.org" },
];

// ============================================================
//  SEARCH STATE
// ============================================================
let mcSearchLoader = "all";
let mcSearchMinRating = 0;
let mcSearchHasSearched = false;

// ============================================================
//  LOCALE HELPERS
// ============================================================
function tt(key, vars) { return t(currentLocale, key, vars); }

function setLocale(locale) {
  const next = locale || "da";
  if (currentLocale === next) { updateAppReleaseLine(); return; }
  currentLocale = next;
  try { document.documentElement.lang = next; } catch {}

  const titleEl = document.getElementById("appTitle");
  if (titleEl) titleEl.textContent = t(next, "ui.appTitle");
  try { document.title = t(next, "ui.appTitle"); } catch {}

  const map = [
    ["labelCountry", "ui.countryLabel"], ["countryPlaceholder", "ui.countryPlaceholder"],
    ["optDenmark", "countries.denmark"], ["optSweden", "countries.sweden"],
    ["optNorway", "countries.norway"], ["optUSA", "countries.usa"],
    ["optUK", "countries.uk"], ["optFrance", "countries.france"],
    ["labelEmail", "ui.emailLabel"], ["labelCode", "ui.codeLabel"],
    ["labelWatcher", "ui.watcherLabel"], ["labelDestination", "ui.destinationLabel"],
    ["historyTitle", "ui.scansSectionTitle"], ["historyTitleInner", "ui.historyTitle"],
    ["scansSectionMeta", "ui.scansSectionMeta"], ["modsSectionTitle", "ui.modsSectionTitle"],
    ["modsSectionMeta", "ui.modsSectionMeta"], ["cleanModsTitle", "ui.cleanModsTitle"],
    ["blockedModsTitle", "ui.blockedModsTitle"], ["outdatedSectionTitle", "ui.outdatedSectionTitle"],
    ["outdatedSectionMeta", "ui.outdatedSectionMeta"], ["websitesSectionTitle", "ui.websitesSectionTitle"],
    ["websitesSectionMeta", "ui.websitesSectionMeta"], ["statCleanTitle", "ui.statCleanTitle"],
    ["statVirusTitle", "ui.statVirusTitle"], ["statOutdatedTitle", "ui.statOutdatedTitle"],
    ["statSitesTitle", "ui.statSitesTitle"],
  ];
  for (const [id, key] of map) {
    const el = document.getElementById(id);
    if (el) el.textContent = t(next, key);
  }
  if (els.email) els.email.placeholder = t(next, "ui.emailPlaceholder");
  if (els.code) els.code.placeholder = t(next, "ui.codePlaceholder");
  if (els.activateBtn) {
    els.activateBtn.textContent = state?.subscription?.renewalRequired ? t(next, "ui.activateRenew") : t(next, "ui.activate");
  }
  if (els.minimizeBtnA) els.minimizeBtnA.textContent = t(next, "ui.minimize");
  if (els.minimizeBtn) els.minimizeBtn.textContent = t(next, "ui.minimize");
  if (els.openRenewalBtn) els.openRenewalBtn.textContent = t(next, "ui.renewButton");
  if (els.scanNowBtn) els.scanNowBtn.textContent = `⚡ ${t(next, "ui.scanNow")}`;
  if (els.openDownloadsBtn) els.openDownloadsBtn.textContent = t(next, "ui.open");
  if (els.pickDestinationBtn) els.pickDestinationBtn.textContent = t(next, "ui.chooseFolder");
  if (els.openDestinationBtn) els.openDestinationBtn.textContent = t(next, "ui.open");
  if (els.clearHistoryBtn) els.clearHistoryBtn.textContent = `🗑 ${t(next, "ui.clearHistory")}`;

  const legendEl = document.getElementById("websitesSectionLegend");
  if (legendEl) {
    legendEl.innerHTML = `
      <span class="legend-chip"><span class="legend-dot safe"></span>${escapeHtml(t(next,"ui.trustSafe"))}</span>
      <span class="legend-chip"><span class="legend-dot medium"></span>${escapeHtml(t(next,"ui.trustMedium"))}</span>
      <span class="legend-chip"><span class="legend-dot unsafe"></span>${escapeHtml(t(next,"ui.trustUnsafe"))}</span>`;
  }
  const capEl = document.getElementById("activationVideoCaption");
  if (capEl) capEl.textContent = t(next, "ui.activationVideoCaption");

  setActiveFlag(next);
  updateAppReleaseLine();
}

function updateAppReleaseLine() {
  if (!els.appReleaseLine) return;
  const v = String(state?.appVersion || "").trim();
  const b = String(state?.appBuildId || "").trim();
  if (v && b) els.appReleaseLine.textContent = tt("ui.appReleaseLine", { version: v, build: b });
  else if (v) els.appReleaseLine.textContent = tt("ui.appReleaseVersionOnly", { version: v });
  else els.appReleaseLine.textContent = "";
}

function setActiveFlag(locale) {
  for (const btn of langFlagButtons) {
    const isActive = String(btn?.dataset?.locale || "") === String(locale || "da");
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

// ============================================================
//  VIDEO INIT
// ============================================================
function initActivationPromoVideo() {
  const vid = document.getElementById("activationPromoVideo");
  if (!vid) return;
  try {
    const pathMod = require("path");
    const osmod = require("os");
    const { pathToFileURL } = require("url");
    const fssync = require("fs");
    const res = String(process.resourcesPath || "").trim();
    const candidates = [
      // User's Desktop video (preferred)
      pathMod.join(osmod.homedir(), "Desktop", "Dashboard", "Videoer", "Minecraft.mp4"),
      // Bundled in app resources
      res && pathMod.join(res, "Minecraft.mp4"),
      res && pathMod.join(res, "dashboardcs.mp4"),
      pathMod.join(__dirname, "dashboardcs.mp4"),
    ].filter((p) => typeof p === "string" && p.length > 0);
    let file = "";
    for (const p of candidates) {
      if (fssync.existsSync(p)) { file = p; break; }
    }
    if (!file) {
      document.getElementById("activationPageBackdrop")?.remove();
      document.getElementById("activationVideoCaption")?.remove();
      return;
    }
    vid.src = pathToFileURL(file).href;
    void vid.play?.().catch(() => {});
  } catch {
    document.getElementById("activationPageBackdrop")?.remove();
    document.getElementById("activationVideoCaption")?.remove();
  }
}

// ============================================================
//  ONBOARDING
// ============================================================
const ONBOARDING_SLIDES = [
  ["Søg Minecraft mods", "Find Fabric, Forge og NeoForge mods fra Modrinth, CurseForge og PlanetMinecraft i ét søgefelt."],
  ["Download sikkert", "Hver fil går først i sandbox, derefter scan — kun rene mods flyttes til din mods-mappe."],
  ["Organisér mods", "Hold styr på loaders, versioner og favoritter — marker mods med ♥ i ModSearch."],
  ["Outdatede mods", "Se hvilke godkendte mods der er ældre end 30 dage og bør opdateres."],
  ["Beskyttelse aktiv", "Modguard Scanner overvåger downloads og blokerer virus og malware."],
  ["Minecraft-tema", "Grønt pixel-inspireret layout med community-forum kun for Minecraft."],
];

function mcGuideImageDataUrl(index) {
  const colors = [
    ["#5aa320", "#1a2510"],
    ["#7dcc2a", "#22301a"],
    ["#44dfdf", "#0d2830"],
    ["#f0c040", "#2a2010"],
    ["#5cd87a", "#102018"],
    ["#3a7214", "#090e04"],
  ][index % 6];
  const [a, b] = colors;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 360">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="620" height="360" rx="8" fill="url(#g)"/>
    <rect x="42" y="44" width="536" height="272" rx="6" fill="#fff" opacity=".12"/>
    <rect x="80" y="82" width="120" height="120" fill="#5aa320" opacity=".8"/>
    <rect x="100" y="102" width="80" height="40" fill="#7dcc2a"/>
    <rect x="320" y="92" width="210" height="24" rx="4" fill="#fff" opacity=".65"/>
    <rect x="320" y="138" width="160" height="18" rx="4" fill="#fff" opacity=".4"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function renderOnboarding() {
  if (!els.onboardSlides || !els.onboardDots) return;
  els.onboardSlides.innerHTML = ONBOARDING_SLIDES.map(([title, body], idx) => `
    <section class="onboard-slide ${idx === onboardingIndex ? "active" : ""}">
      <img src="${mcGuideImageDataUrl(idx)}" alt="" />
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
      </div>
    </section>
  `).join("");
  els.onboardDots.innerHTML = ONBOARDING_SLIDES.map((_, idx) =>
    `<button class="${idx === onboardingIndex ? "active" : ""}" type="button" data-onboard-dot="${idx}"></button>`
  ).join("");
  if (els.onboardBackBtn) els.onboardBackBtn.disabled = onboardingIndex <= 0;
  if (els.onboardNextBtn) els.onboardNextBtn.style.display = onboardingIndex >= ONBOARDING_SLIDES.length - 1 ? "none" : "";
  if (els.onboardReadyBtn) els.onboardReadyBtn.style.display = onboardingIndex >= ONBOARDING_SLIDES.length - 1 ? "" : "none";
}

// ============================================================
//  DASHBOARD NAVIGATION
// ============================================================
function setDashboardTab(tab) {
  const allowed = ["antivirus", "search", "downloads", "favorites", "forum", "outdated", "profile"];
  const next = allowed.includes(String(tab || "")) ? String(tab) : "search";
  if (els.dashboardView) els.dashboardView.dataset.activeTab = next;
  for (const btn of dashboardNavItems) {
    const active = String(btn?.dataset?.dashboardTab || "") === next;
    btn.classList.toggle("active", active);
  }
  if (next === "search") {
    if (mcSearchHasSearched) runMcSearch();
    else renderMcSearchIdle();
  }
  if (next === "forum") renderForumPosts();
  if (next === "favorites") renderFavoritesHub();
  if (next === "downloads") syncDownloadsHubPaths();
}

for (const btn of dashboardNavItems) {
  btn.addEventListener("click", () => setDashboardTab(btn.dataset.dashboardTab || "search"));
}

els.onboardBackBtn?.addEventListener("click", () => {
  onboardingIndex = Math.max(0, onboardingIndex - 1);
  renderOnboarding();
});
els.onboardNextBtn?.addEventListener("click", () => {
  onboardingIndex = Math.min(ONBOARDING_SLIDES.length - 1, onboardingIndex + 1);
  renderOnboarding();
});
els.onboardReadyBtn?.addEventListener("click", () => {
  onboardingRequired = false;
  try { localStorage.setItem("mc_modguard_onboarded", "1"); } catch {}
  setActiveView("dashboard");
  setDashboardMode(true);
  ipcRenderer.invoke("set-window-stage", "main").catch(() => {});
  setDashboardTab("search");
});
els.onboardDots?.addEventListener("click", (event) => {
  const btn = event.target?.closest?.("[data-onboard-dot]");
  if (!btn) return;
  onboardingIndex = Math.max(0, Math.min(ONBOARDING_SLIDES.length - 1, Number(btn.getAttribute("data-onboard-dot") || 0)));
  renderOnboarding();
});

// ============================================================
//  MINECRAFT MOD SEARCH
// ============================================================
const mcSearchInput = document.getElementById("mcSearchInput");
const mcSearchBtn = document.getElementById("mcSearchBtn");
const mcCategoryFilter = document.getElementById("mcCategoryFilter");
const mcVersionFilter = document.getElementById("mcVersionFilter");
const mcSortFilter = document.getElementById("mcSortFilter");
const mcResetFilters = document.getElementById("mcResetFilters");
const mcBrowserScreen = document.getElementById("mcBrowserScreen");
const favoritesGrid = document.getElementById("favoritesGrid");
const favoritesSearchInput = document.getElementById("favoritesSearchInput");
const navOutdatedBadge = document.getElementById("navOutdatedBadge");
const dashboardNavItems = Array.from(document.querySelectorAll(".dashboard-nav-item[data-dashboard-tab]"));
const FAVORITES_KEY = "mc_modguard_favorites";

function normalizeMc(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreMcMod(item, queryTokens) {
  if (!queryTokens.length) return 1;
  const hay = normalizeMc(`${item.title} ${item.description} ${item.tags.join(" ")} ${item.category} ${item.platform} ${item.loaders.join(" ")}`);
  let score = 0;
  for (const token of queryTokens) {
    if (token.length < 2) continue;
    if (hay.includes(token)) score += token.length > 5 ? 3 : 2;
  }
  return score;
}

function getMcResults(rawQuery) {
  const tokens = normalizeMc(rawQuery).split(" ").filter(t => t.length >= 2);
  const cat = mcCategoryFilter?.value || "all";
  const ver = mcVersionFilter?.value || "all";
  const sort = mcSortFilter?.value || "relevance";

  let items = MC_SEED_ITEMS.filter(item => {
    if (cat !== "all" && item.category !== cat) return false;
    if (ver !== "all" && !item.minVersion.startsWith(ver)) return false;
    if (mcSearchLoader !== "all" && !item.loaders.includes(mcSearchLoader)) return false;
    if (mcSearchMinRating > 0 && Math.round(item.rating) < mcSearchMinRating) return false;
    return true;
  });

  if (tokens.length) {
    const scored = items.map(item => ({ item, score: scoreMcMod(item, tokens) })).filter(e => e.score > 0);
    if (sort === "relevance") scored.sort((a, b) => b.score - a.score || b.item.downloads - a.item.downloads);
    else if (sort === "downloads") scored.sort((a, b) => b.item.downloads - a.item.downloads);
    else if (sort === "alphabetical") scored.sort((a, b) => a.item.title.localeCompare(b.item.title));
    items = scored.map(e => e.item);
  } else {
    if (sort === "downloads") items.sort((a, b) => b.downloads - a.downloads);
    else if (sort === "alphabetical") items.sort((a, b) => a.title.localeCompare(b.title));
    else items.sort((a, b) => b.downloads - a.downloads);
  }
  return items;
}

function fmtDownloads(n) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M ⬇`;
  if (n >= 1_000) return `${Math.round(n/1_000)}K ⬇`;
  return `${n} ⬇`;
}

function renderMcStars(rating) {
  const r = Math.round(Number(rating) || 4);
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function mcThumbStyle(item) {
  if (item.thumbUrl) return `background-image:url('${escapeHtml(item.thumbUrl)}')`;
  const hue = (item.title.length * 37) % 360;
  return `background:linear-gradient(145deg,hsl(${hue} 45% 28%),hsl(${(hue + 40) % 360} 35% 18%))`;
}

function isMcFavorite(id) {
  try {
    const list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(list) && list.includes(id);
  } catch {
    return false;
  }
}

function toggleMcFavorite(id) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch {}
  if (!Array.isArray(list)) list = [];
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(id);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch {}
}

function renderMcModCard(item) {
  const fav = isMcFavorite(item.id);
  const loaderBadges = item.loaders.slice(0, 2).map((l) => `<span class="mod-card-tag">${escapeHtml(l)}</span>`).join("");
  return `
    <article class="mod-card" data-mc-mod-id="${escapeHtml(item.id)}" data-mc-mod-url="${escapeHtml(item.url)}">
      <div class="mod-card-media" style="${mcThumbStyle(item)}">
        <button type="button" class="mod-card-fav ${fav ? "is-fav" : ""}" data-mc-fav="${escapeHtml(item.id)}" aria-label="Favorit">♥</button>
      </div>
      <div class="mod-card-body">
        <h3 class="mod-card-title">${escapeHtml(item.title)}</h3>
        <div class="mod-card-meta">
          <span class="mod-card-tag">${escapeHtml(item.platform)}</span>
          ${loaderBadges}
          <span>${escapeHtml(item.minVersion)}+</span>
          <span>${escapeHtml(fmtDownloads(item.downloads))}</span>
          <span style="color:var(--gold)">${renderMcStars(item.rating)}</span>
        </div>
      </div>
    </article>`;
}

function renderMcSearchIdle() {
  mcSearchHasSearched = false;
  if (!mcBrowserScreen) return;
  mcBrowserScreen.innerHTML = `
    <div class="browser-empty" id="mcSearchIdle">
      <svg viewBox="0 0 16 16" width="52" height="52" shape-rendering="crispEdges" aria-hidden="true" style="opacity:0.55">
        <rect width="16" height="16" fill="#41a247"/>
        <rect x="2" y="3" width="4" height="3" fill="#1a1a1a"/>
        <rect x="10" y="3" width="4" height="3" fill="#1a1a1a"/>
        <rect x="5" y="8" width="6" height="1" fill="#1a1a1a"/>
        <rect x="6" y="10" width="4" height="2" fill="#1a1a1a"/>
      </svg>
      <strong>Søg efter Minecraft mods</strong>
      <span class="search-idle-sub">Skriv et søgeord og tryk Søg — kun Modrinth, CurseForge og PlanetMinecraft.</span>
    </div>`;
}

function renderMcSearchSkeleton() {
  if (!mcBrowserScreen) return;
  mcBrowserScreen.innerHTML = `
    <div class="mod-grid-skeleton" aria-busy="true">
      ${Array.from({ length: 8 }, () => `<div class="mod-card-skeleton"></div>`).join("")}
    </div>`;
}

function runMcSearch() {
  if (!mcBrowserScreen) return;
  const raw = String(mcSearchInput?.value || "").replace(/#/g, "").replace(/\s+/g, " ").trim();
  if (!raw) {
    renderMcSearchIdle();
    return;
  }
  mcSearchHasSearched = true;
  renderMcSearchSkeleton();
  const items = getMcResults(raw);
  setTimeout(() => {
    if (!items.length) {
      mcBrowserScreen.innerHTML = `
        <div class="browser-empty">
          <strong>Ingen resultater</strong>
          <span class="search-idle-sub">Prøv et andet søgeord eller fjern nogle filtre.</span>
        </div>`;
      return;
    }
    mcBrowserScreen.innerHTML = `<div class="mod-grid">${items.map(renderMcModCard).join("")}</div>`;
  }, 180);
}

// Hashtag live input
mcSearchInput?.addEventListener("input", (e) => {
  const input = e.target;
  const val = input.value;
  const cursor = input.selectionStart ?? val.length;
  const trailing = val.length > 0 && val[val.length - 1] === " ";
  const words = val.split(/\s+/).filter(w => w.length > 0 && w !== "#");
  const tagged = words.map(w => w.startsWith("#") ? w : "#" + w);
  const newVal = tagged.join(" ") + (trailing ? " " : "");
  if (newVal !== val) {
    const delta = newVal.length - val.length;
    input.value = newVal;
    input.setSelectionRange(Math.max(0, cursor + delta), Math.max(0, cursor + delta));
  }
});

mcSearchInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") runMcSearch(); });
mcSearchBtn?.addEventListener("click", runMcSearch);

// Loader toggles
for (const btn of document.querySelectorAll(".loader-btn")) {
  btn.addEventListener("click", () => {
    mcSearchLoader = btn.dataset.mcLoader || "all";
    for (const b of document.querySelectorAll(".loader-btn")) b.classList.toggle("active", b.dataset.mcLoader === mcSearchLoader);
    if (mcSearchHasSearched) runMcSearch();
  });
}

// Category / version / sort filter changes
mcCategoryFilter?.addEventListener("change", () => { if (mcSearchHasSearched) runMcSearch(); });
mcVersionFilter?.addEventListener("change", () => { if (mcSearchHasSearched) runMcSearch(); });
mcSortFilter?.addEventListener("change", () => { if (mcSearchHasSearched) runMcSearch(); });

// Reset filters
mcResetFilters?.addEventListener("click", () => {
  mcSearchLoader = "all";
  mcSearchMinRating = 0;
  if (mcCategoryFilter) mcCategoryFilter.value = "all";
  if (mcVersionFilter) mcVersionFilter.value = "all";
  if (mcSortFilter) mcSortFilter.value = "relevance";
  for (const b of document.querySelectorAll(".loader-btn")) b.classList.toggle("active", b.dataset.mcLoader === "all");
  syncMcStarPicker();
  if (mcSearchHasSearched) runMcSearch();
});

// Star picker
function syncMcStarPicker() {
  for (const btn of document.querySelectorAll(".mc-star-btn")) {
    const n = Number(btn.getAttribute("data-star") || 0);
    btn.classList.toggle("active", n <= mcSearchMinRating && mcSearchMinRating > 0);
  }
}
document.getElementById("mcStarPicker")?.addEventListener("click", (e) => {
  const btn = e.target?.closest?.(".mc-star-btn");
  if (!btn) return;
  const clicked = Number(btn.getAttribute("data-star") || 0);
  mcSearchMinRating = clicked === mcSearchMinRating ? 0 : clicked;
  syncMcStarPicker();
  if (mcSearchHasSearched) runMcSearch();
});

mcBrowserScreen?.addEventListener("click", (e) => {
  const favBtn = e.target?.closest?.("[data-mc-fav]");
  if (favBtn) {
    e.stopPropagation();
    toggleMcFavorite(favBtn.getAttribute("data-mc-fav"));
    if (mcSearchHasSearched) runMcSearch();
    return;
  }
  const card = e.target?.closest?.(".mod-card");
  if (!card) return;
  const url = card.dataset.mcModUrl;
  if (url) ipcRenderer.invoke("open-url", url).catch(() => {});
});

function loadMcFavorites() {
  try {
    const ids = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    if (!Array.isArray(ids)) return [];
    return ids.map((id) => MC_SEED_ITEMS.find((item) => item.id === id)).filter(Boolean);
  } catch {
    return [];
  }
}

function renderFavoritesHub() {
  if (!favoritesGrid) return;
  const q = String(favoritesSearchInput?.value || "").trim().toLowerCase();
  let list = loadMcFavorites();
  if (q) list = list.filter((item) => normalizeMc(`${item.title} ${item.description}`).includes(normalizeMc(q)));
  if (!list.length) {
    favoritesGrid.innerHTML = `<div class="browser-empty"><strong>Ingen favoritter endnu</strong><span class="search-idle-sub">Tryk ♥ på en mod i ModSearch.</span></div>`;
    return;
  }
  favoritesGrid.innerHTML = `<div class="mod-grid">${list.map(renderMcModCard).join("")}</div>`;
}

favoritesSearchInput?.addEventListener("input", () => {
  if (els.dashboardView?.dataset?.activeTab === "favorites") renderFavoritesHub();
});

favoritesGrid?.addEventListener("click", (e) => {
  const favBtn = e.target?.closest?.("[data-mc-fav]");
  if (favBtn) {
    toggleMcFavorite(favBtn.getAttribute("data-mc-fav"));
    renderFavoritesHub();
    return;
  }
  const card = e.target?.closest?.(".mod-card");
  if (!card) return;
  const url = card.dataset.mcModUrl;
  if (url) ipcRenderer.invoke("open-url", url).catch(() => {});
});

function syncDownloadsHubPaths() {
  const dl = document.getElementById("downloadsPathDl");
  const dst = document.getElementById("destinationPathDl");
  if (dl) dl.textContent = state?.downloadsFolder || "(Downloads)";
  if (dst) dst.textContent = state?.destinationFolder || "(ikke valgt endnu)";
}

document.getElementById("openDownloadsBtnDl")?.addEventListener("click", () => els.openDownloadsBtn?.click());
document.getElementById("openDestinationBtnDl")?.addEventListener("click", () => els.openDestinationBtn?.click());
document.getElementById("pickDestinationBtnDl")?.addEventListener("click", () => els.pickDestinationBtn?.click());

// ============================================================
//  FORUM
// ============================================================
function forumMatchesFilter(post) {
  if (mcForumFilter === "all") return true;
  const hay = `${post.title} ${post.sub} ${post.tags.join(" ")}`.toLowerCase();
  if (mcForumFilter === "security") return /sikkerhed|malware|advarsel|virus|rat|scan/i.test(hay);
  if (mcForumFilter === "guides") return /guide|liste|tip|tutorial|kompat/i.test(hay);
  return !/sikkerhed|malware|advarsel/i.test(hay);
}

function renderForumPosts() {
  const container = document.getElementById("mcForumPosts");
  if (!container) return;
  const posts = MC_FORUM_POSTS.filter(forumMatchesFilter);
  container.innerHTML = posts.map(post => `
    <div class="forum-card" data-forum-url="${escapeHtml(post.url || "")}">
      <div class="forum-card-top">
        ${creepersAvatarSvg(post.avatar)}
        <div class="forum-card-body">
          <div class="forum-card-title">${escapeHtml(post.title)}</div>
          <div class="forum-card-sub">${escapeHtml(post.sub)}</div>
          <div class="forum-card-tags">${post.tags.map(tag => `<span class="forum-tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
      </div>
      <div class="forum-card-footer">
        <span class="forum-stat">▲ ${post.votes.toLocaleString("da-DK")}</span>
        <span class="forum-stat">💬 ${post.replies}</span>
      </div>
    </div>`).join("");
}

// Forum link buttons
document.getElementById("forumLinkModrinth")?.addEventListener("click", () => ipcRenderer.invoke("open-url", "https://modrinth.com").catch(() => {}));
document.getElementById("forumLinkCurseForge")?.addEventListener("click", () => ipcRenderer.invoke("open-url", "https://www.curseforge.com/minecraft/mc-mods").catch(() => {}));
document.getElementById("forumLinkFTB")?.addEventListener("click", () => ipcRenderer.invoke("open-url", "https://www.reddit.com/r/feedthebeast").catch(() => {}));
document.getElementById("forumLinkPMC")?.addEventListener("click", () => ipcRenderer.invoke("open-url", "https://www.planetminecraft.com").catch(() => {}));
document.getElementById("forumLinkSpigot")?.addEventListener("click", () => ipcRenderer.invoke("open-url", "https://www.spigotmc.org").catch(() => {}));

document.getElementById("forumFilterRow")?.addEventListener("click", (e) => {
  const btn = e.target?.closest?.("[data-forum-filter]");
  if (!btn) return;
  mcForumFilter = btn.getAttribute("data-forum-filter") || "all";
  for (const b of document.querySelectorAll("#forumFilterRow [data-forum-filter]")) {
    b.classList.toggle("active", b === btn);
  }
  renderForumPosts();
});

document.getElementById("mcForumPosts")?.addEventListener("click", (e) => {
  const card = e.target?.closest?.(".forum-card");
  if (!card) return;
  const url = card.dataset.forumUrl;
  if (url) ipcRenderer.invoke("open-url", url).catch(() => {});
});

// ============================================================
//  SETTINGS TAB – mirror path display
// ============================================================
function syncSettingsPaths() {
  const dl = document.getElementById("downloadsPathS");
  const dst = document.getElementById("destinationPathS");
  if (dl) dl.textContent = state?.downloadsFolder || "(Downloads)";
  if (dst) dst.textContent = state?.destinationFolder || "(ikke valgt endnu)";
}
document.getElementById("pickDestinationBtnS")?.addEventListener("click", async () => {
  try { await ipcRenderer.invoke("pick-destination-folder"); } catch {}
});

// ============================================================
//  HELPER FUNCTIONS
// ============================================================
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || ""; }
}

function badgeClass(status) {
  if (status === "clean") return "clean";
  if (status === "virus") return "virus";
  if (status === "ignored") return "";
  return "error";
}

function badgeText(status) {
  if (status === "clean") return tt("ui.badgeClean");
  if (status === "virus") return tt("ui.badgeVirus");
  if (status === "scanning") return tt("ui.badgeScan");
  if (status === "ignored") return tt("ui.badgeIgnored");
  return tt("ui.badgeError");
}

function getRiskForHost(rawHost) {
  const host = String(rawHost || "").trim().toLowerCase().replace(/^www\./, "");
  if (!host) return { level: "unknown", label: tt("ui.trustUnknown"), hint: tt("ui.trustUnknownHint") };

  const safeHosts = ["modrinth.com","curseforge.com","minecraft.net","minecraftforum.net","spigotmc.org","planetminecraft.com","papermc.io","fabricmc.net","neoforged.net","files.minecraftforge.net"];
  const mediumHosts = ["github.com","gitlab.com","dropbox.com","drive.google.com","mediafire.com","ko-fi.com","patreon.com","tumblr.com","mega.nz"];
  const unsafeHosts = ["linkvertise.com","adf.ly","bit.ly","tinyurl.com","ouo.io","exe.io","discordapp.com","discord.gg"];

  const match = (list) => list.some(e => host === e || host.endsWith(`.${e}`));
  if (match(safeHosts)) return { level: "safe", label: tt("ui.trustSafe"), hint: tt("ui.trustSafeHint") };
  if (match(unsafeHosts)) return { level: "unsafe", label: tt("ui.trustUnsafe"), hint: tt("ui.trustUnsafeHint") };
  if (match(mediumHosts)) return { level: "medium", label: tt("ui.trustMedium"), hint: tt("ui.trustMediumHint") };
  return { level: "medium", label: tt("ui.trustMedium"), hint: tt("ui.trustMediumHint") };
}

function formatSourceText(item) {
  return String(item?.sourceHost || "").trim() || tt("ui.sourceUnknown");
}

function getAgeDays(iso) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function isOutdatedCleanItem(item) { return item?.status === "clean" && getAgeDays(item?.at) >= 30; }
function isBlockedStatus(status) { return status === "virus" || status === "error" || status === "ignored"; }

function renderEmptyCard(title) {
  return `<div class="empty-card"><div class="empty-copy">${escapeHtml(title)}</div></div>`;
}

function renderModCards(container, items, emptyText) {
  if (!container) return;
  if (!items?.length) { container.innerHTML = renderEmptyCard(emptyText); return; }
  container.innerHTML = items.map((item) => {
    const risk = getRiskForHost(item?.sourceHost);
    const meta = [fmtDate(item?.at), `${tt("ui.sourceLabel")}: ${formatSourceText(item)}`];
    if (item?.sourcePath) meta.push(String(item.sourcePath));
    if (item?.savedTo) meta.push(`${tt("ui.savedArrow")} ${item.savedTo}`);
    if (item?.message && item?.status !== "clean") meta.push(item.message);
    const detail = [];
    if (item?.contentType) detail.push(item.contentType);
    if (item?.hash) detail.push(`SHA-256: ${String(item.hash).slice(0,16)}…`);
    if (item?.vt?.engines) detail.push(`VT: ${item.vt.malicious}/${item.vt.engines}`);
    if (Array.isArray(item?.reasons) && item.reasons.length) detail.push(item.reasons.slice(0,2).join(" · "));
    return `<div class="mod-item">
      <div class="mod-head">
        <div>
          <div class="mod-name">${escapeHtml(item?.fileName || tt("ui.unknownFile"))}</div>
          <div class="mod-meta">${escapeHtml(meta.join(" · "))}</div>
          ${detail.length ? `<div class="mod-meta">${escapeHtml(detail.join(" · "))}</div>` : ""}
        </div>
        <div class="badge-row">
          <span class="mini-badge ${badgeClass(item?.status||"error")}">${escapeHtml(badgeText(item?.status||"error"))}</span>
          <span class="mini-badge ${risk.level}">${escapeHtml(risk.label)}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

function renderOutdatedCards(container, items) {
  if (!container) return;
  if (!items?.length) { container.innerHTML = renderEmptyCard(tt("ui.noOutdatedMods")); return; }
  container.innerHTML = items.map((item) => {
    const days = getAgeDays(item?.at);
    const risk = getRiskForHost(item?.sourceHost);
    return `<div class="mod-item">
      <div class="mod-head">
        <div>
          <div class="mod-name">${escapeHtml(item?.fileName || tt("ui.unknownFile"))}</div>
          <div class="mod-meta">${escapeHtml(`${fmtDate(item?.at)} · ${tt("ui.outdatedAge",{days})} · ${tt("ui.sourceLabel")}: ${formatSourceText(item)}`)}</div>
          <div class="mod-meta">${escapeHtml(tt("ui.outdatedMcHint"))}</div>
        </div>
        <div class="badge-row"><span class="mini-badge ${risk.level}">${escapeHtml(risk.label)}</span></div>
      </div>
    </div>`;
  }).join("");
}

function renderWebsiteCards(container, items) {
  if (!container) return;
  if (!items?.length) { container.innerHTML = renderEmptyCard(tt("ui.noSites")); return; }
  const grouped = new Map();
  for (const item of items) {
    const key = String(item?.sourceHost || "").trim() || "__unknown__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  const cards = Array.from(grouped.entries()).map(([key, group]) => {
    const host = key === "__unknown__" ? "" : key;
    const risk = getRiskForHost(host);
    return { host, risk, cleanCount: group.filter(i=>i?.status==="clean").length, blockedCount: group.filter(i=>isBlockedStatus(i?.status)).length, count: group.length, samples: group.slice(0,3).map(i=>i?.fileName||tt("ui.unknownFile")) };
  }).sort((a,b) => b.count - a.count || a.host.localeCompare(b.host));
  container.innerHTML = cards.map(site => `<div class="site-card">
    <div class="site-top">
      <div>
        <div class="site-host">${escapeHtml(site.host||tt("ui.sourceUnknown"))}</div>
        <div class="site-meta-copy">${escapeHtml(`${site.count} ${tt("ui.modsWord")} · ${site.cleanCount} ${tt("ui.cleanModsTitle").toLowerCase()} · ${site.blockedCount} ${tt("ui.blockedModsTitle").toLowerCase()}`)}</div>
      </div>
      <div class="site-badges"><span class="mini-badge ${site.risk.level}">${escapeHtml(site.risk.label)}</span></div>
    </div>
    <div class="site-note">${escapeHtml(site.risk.hint)}</div>
    <div class="site-files">${site.samples.map(s=>`<span class="site-file-chip">${escapeHtml(s)}</span>`).join("")}</div>
  </div>`).join("");
}

function renderHistory(items) {
  els.historyList.innerHTML = "";
  if (!items?.length) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    empty.innerHTML = `<div><div class="history-name">${escapeHtml(tt("ui.emptyTitle"))}</div><div class="history-meta">${escapeHtml(tt("ui.emptyMeta"))}</div></div><div class="badge">—</div>`;
    els.historyList.appendChild(empty);
    return;
  }
  for (const it of items) {
    const row = document.createElement("div");
    row.className = "history-item";
    const meta = [];
    if (it?.at) meta.push(fmtDate(it.at));
    if (it?.savedTo) meta.push(`${tt("ui.savedArrow")} ${it.savedTo}`);
    else if (it?.status === "virus") meta.push(tt("ui.msgVirus",{file:it?.fileName||""}));
    else if (it?.status === "clean") meta.push(tt("ui.msgClean",{file:it?.fileName||""}));
    else if (it?.status === "ignored") meta.push(tt("ui.badgeIgnored"));
    else if (it?.message) meta.push(it.message);
    row.innerHTML = `<div><div class="history-name">${escapeHtml(it?.fileName||tt("ui.unknownFile"))}</div><div class="history-meta">${escapeHtml(meta.join(" · "))}</div></div><div class="badge ${badgeClass(it?.status||"error")}">${badgeText(it?.status||"error")}</div>`;
    els.historyList.appendChild(row);
  }
}

function appendLog(chunk) {
  if (!chunk) return;
  const text = typeof chunk === "string" ? chunk : String(chunk);
  els.log.textContent += text;
  if (!text.endsWith("\n")) els.log.textContent += "\n";
  els.log.scrollTop = els.log.scrollHeight;
  if (els.log.textContent.length > 60_000) els.log.textContent = els.log.textContent.slice(-60_000);
}

// ============================================================
//  RENEWAL
// ============================================================
function formatSubscriptionReason(reason) {
  if (reason === "paymentDue") return tt("ui.subscriptionPaymentDue");
  if (reason === "activationLimit") return tt("ui.subscriptionLimitReached");
  if (reason === "expired") return tt("ui.subscriptionExpired");
  return tt("ui.subscriptionRenewRequired");
}

function renderRenewal(subscription) {
  const active = !!subscription?.renewalRequired;
  els.renewalPanel?.classList.toggle("active", active);
  if (!active) return;
  if (els.renewalTitle) els.renewalTitle.textContent = tt("ui.renewalTitle");
  if (els.renewalBody) els.renewalBody.textContent = formatSubscriptionReason(subscription?.reason);
  if (els.renewalMeta) {
    const masked = subscription?.emailMasked || subscription?.email || "—";
    els.renewalMeta.textContent = tt("ui.renewalMeta", { email: masked });
  }
  if (els.renewalUses) els.renewalUses.textContent = tt("ui.renewalUses", { used: String(subscription?.activationCount||0), total: String(subscription?.maxActivations||10) });
  if (els.renewalExpiry) {
    const expiresText = subscription?.expiresAt ? fmtDate(subscription.expiresAt) : tt("ui.renewalNoExpiry");
    els.renewalExpiry.textContent = tt("ui.renewalExpiry", { date: expiresText });
  }
  if (els.renewalStatus) els.renewalStatus.textContent = tt("ui.renewalStatus", { status: formatSubscriptionReason(subscription?.reason) });
  if (els.renewalQr) {
    const qrRaw = String(subscription?.renewalUrl || "").trim();
    els.renewalQr.src = qrRaw ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrRaw)}` : "";
    els.renewalQr.alt = tt("ui.renewQrAlt");
  }
  if (els.email && subscription?.email && !els.email.value.trim()) els.email.value = subscription.email;
}

// ============================================================
//  LOCALE FROM STORAGE
// ============================================================
function initLocaleFromStorage() {
  let saved = "";
  try { saved = String(localStorage.getItem("skimo_locale") || "").trim(); } catch {}
  if (saved && FLAG_TO_COUNTRY[saved]) {
    forcedLocale = saved;
    ipcRenderer.invoke("set-locale-preference", saved).catch(() => {});
    if (els.country && !state?.activated) {
      const c = FLAG_TO_COUNTRY[saved];
      if (c) els.country.value = c;
    }
    setLocale(saved);
  } else {
    setActiveFlag(COUNTRY_TO_FLAG[els.country?.value] || "da");
  }
}

// ============================================================
//  VIEW STATE
// ============================================================
function setActivationMessage(text, isError = false) {
  els.activationMessage.textContent = text || "";
  els.activationMessage.className = `hint${isError ? " error" : ""}`;
}

function setMessage(text, isError = false) {
  els.message.textContent = text || "";
  els.message.className = `hint${isError ? " error" : ""}`;
}

function setActiveView(id) {
  els.activationView?.classList.toggle("active", id === "activation");
  els.onboardingView?.classList.toggle("active", id === "onboarding");
  els.dashboardView?.classList.toggle("active", id === "dashboard");
  const isActivation = id === "activation" || id === "onboarding";
  els.appWrap?.classList.toggle("activation-screen", isActivation);
  if (id === "onboarding") {
    document.body.dataset.appStage = "onboarding";
    ipcRenderer.invoke("set-window-stage", "onboarding").catch(() => {});
  } else if (id === "dashboard") {
    document.body.dataset.appStage = "main";
    ipcRenderer.invoke("set-window-stage", "main").catch(() => {});
  } else {
    document.body.dataset.appStage = "login";
    ipcRenderer.invoke("set-window-stage", "login").catch(() => {});
  }
}

function setDashboardMode(active) {
  els.appWrap?.classList.toggle("dashboard-mode", !!active);
  els.mainCard?.classList.toggle("dashboard-mode", !!active);
}

// ============================================================
//  MAIN RENDER
// ============================================================
function render(nextState) {
  state = nextState;
  const activated = !!state?.activated;
  const enabled = !!state?.protectionEnabled;
  const scanning = !!state?.scanning;
  const autoLocale = state?.locale || localeFromCountry(els.country?.value) || "da";
  setLocale(forcedLocale || autoLocale);
  renderRenewal(state?.subscription);

  if (!activated) {
    setActiveView("activation");
    setDashboardMode(false);
    els.activateBtn.disabled = scanning;
    if (state?.subscription?.renewalRequired) setActivationMessage(formatSubscriptionReason(state.subscription.reason), true);
    return;
  }

  try {
    if (localStorage.getItem("mc_modguard_onboarded") === "1") onboardingRequired = false;
  } catch {}

  if (onboardingRequired) {
    renderOnboarding();
    setActiveView("onboarding");
    setDashboardMode(false);
  } else {
    setActiveView("dashboard");
    setDashboardMode(true);
    setDashboardTab(els.dashboardView?.dataset?.activeTab || "search");
  }

  const dotClass = scanning ? " scan" : enabled ? " on" : " off";
  els.statusDot.className = `dot${dotClass}`;
  els.statusText.textContent = scanning ? `${tt("ui.statusPrefix")} ${tt("ui.statusScanning")}` : enabled ? `${tt("ui.statusPrefix")} ${tt("ui.statusOnAuto")}` : `${tt("ui.statusPrefix")} ${tt("ui.statusOff")}`;
  els.toggleBtn.textContent = enabled ? tt("ui.toggleOff") : tt("ui.toggleOn");

  els.downloadsPath.textContent = state?.downloadsFolder || tt("ui.downloadsPlaceholder");
  els.destinationPath.textContent = state?.destinationFolder || tt("ui.destinationPlaceholder");
  els.openDestinationBtn.disabled = !state?.destinationFolder;
  els.toggleBtn.disabled = scanning;
  els.pickDestinationBtn.disabled = scanning;
  els.openDownloadsBtn.disabled = scanning;
  els.openDestinationBtn.disabled = scanning || !state?.destinationFolder;
  els.scanNowBtn.disabled = scanning || !enabled;
  if (els.batchScanModsBtn) els.batchScanModsBtn.disabled = scanning || !activated;
  els.clearHistoryBtn.disabled = scanning;

  const historyItems = Array.isArray(state?.history) ? state.history : [];
  const cleanItems = historyItems.filter(i => i?.status === "clean");
  const blockedItems = historyItems.filter(i => isBlockedStatus(i?.status));
  const outdatedItems = cleanItems.filter(isOutdatedCleanItem);
  const uniqueSites = new Set(historyItems.map(i => String(i?.sourceHost||"").trim() || "__unknown__").filter(Boolean));

  if (els.historyCount) els.historyCount.textContent = `${historyItems.length}`;
  if (els.historyCountInner) els.historyCountInner.textContent = `${historyItems.length}`;
  if (els.statCleanCount) els.statCleanCount.textContent = `${cleanItems.length}`;
  if (els.statVirusCount) els.statVirusCount.textContent = `${blockedItems.length}`;
  if (els.statOutdatedCount) els.statOutdatedCount.textContent = `${outdatedItems.length}`;
  if (els.statSitesCount) els.statSitesCount.textContent = `${uniqueSites.size}`;
  if (els.cleanModsCount) els.cleanModsCount.textContent = `${cleanItems.length}`;
  if (els.blockedModsCount) els.blockedModsCount.textContent = `${blockedItems.length}`;
  if (els.outdatedModsCount) els.outdatedModsCount.textContent = `${outdatedItems.length}`;
  if (navOutdatedBadge) navOutdatedBadge.textContent = `${outdatedItems.length}`;
  if (els.websitesCount) els.websitesCount.textContent = `${uniqueSites.size}`;

  renderModCards(els.cleanModsList, cleanItems, tt("ui.noCleanMods"));
  renderModCards(els.blockedModsList, blockedItems, tt("ui.noBlockedMods"));
  renderOutdatedCards(els.outdatedModsList, outdatedItems);
  renderWebsiteCards(els.websiteList, historyItems);
  renderHistory(historyItems);
  syncSettingsPaths();
  syncDownloadsHubPaths();

  const last = state?.lastEvent;
  if (last?.status === "virus") setMessage(tt("ui.msgVirus",{file:last.fileName}), true);
  else if (last?.status === "clean") setMessage(tt("ui.msgClean",{file:last.fileName}));
  else if (last?.status === "error") setMessage(last?.message || tt("ui.badgeError"), true);
  else if (!enabled) setMessage(tt("ui.msgOffHint"));
  else setMessage(tt("ui.msgOnHint"));
}

async function refreshState() {
  render(await ipcRenderer.invoke("get-state"));
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
els.country?.addEventListener("change", () => {
  forcedLocale = null;
  try { localStorage.removeItem("skimo_locale"); } catch {}
  ipcRenderer.invoke("set-locale-preference", "").catch(() => {});
  setLocale(localeFromCountry(els.country.value));
});
els.minimizeBtnA?.addEventListener("click", () => ipcRenderer.send("minimize-to-top"));
els.minimizeBtn?.addEventListener("click", () => ipcRenderer.send("minimize-to-top"));

els.activateBtn?.addEventListener("click", async () => {
  try {
    setActivationMessage("");
    await ipcRenderer.invoke("activate", { country: els.country?.value||"", email: els.email?.value||"", code: els.code?.value||"" });
    setActivationMessage("Aktiveret ✅");
  } catch (err) { setActivationMessage(err?.message || String(err), true); }
});

els.toggleBtn?.addEventListener("click", async () => {
  try { setMessage(""); await ipcRenderer.invoke("set-protection", !state?.protectionEnabled); }
  catch (err) { setMessage(err?.message || String(err), true); }
});

els.pickDestinationBtn?.addEventListener("click", async () => {
  try { setMessage(""); await ipcRenderer.invoke("pick-destination-folder"); }
  catch (err) { setMessage(err?.message || String(err), true); }
});

els.openDownloadsBtn?.addEventListener("click", async () => {
  try { await ipcRenderer.invoke("open-folder", "downloads"); }
  catch (err) { setMessage(err?.message || String(err), true); }
});

els.openDestinationBtn?.addEventListener("click", async () => {
  try { await ipcRenderer.invoke("open-folder", "destination"); }
  catch (err) { setMessage(err?.message || String(err), true); }
});

els.scanNowBtn?.addEventListener("click", async () => {
  try { appendLog(`\n--- ${tt("ui.scanNow")} ---`); await ipcRenderer.invoke("scan-downloads-now"); }
  catch (err) { setMessage(err?.message || String(err), true); }
});

els.batchScanModsBtn?.addEventListener("click", async () => {
  try {
    appendLog("\n--- Batch-scan mods-mappe ---");
    const res = await ipcRenderer.invoke("scan-mods-folder-batch-readonly");
    if (res?.canceled) appendLog("\n(annulleret)");
    else appendLog(`\nFærdig: ${res?.scanned ?? 0} / ${res?.total ?? 0}`);
  } catch (err) { setMessage(err?.message || String(err), true); }
});

els.clearHistoryBtn?.addEventListener("click", async () => {
  try { await ipcRenderer.invoke("clear-history"); }
  catch (err) { setMessage(err?.message || String(err), true); }
});

els.openRenewalBtn?.addEventListener("click", async () => {
  try { await ipcRenderer.invoke("open-renewal-url"); }
  catch (err) { setActivationMessage(err?.message || String(err), true); }
});

for (const btn of langFlagButtons) {
  btn.addEventListener("click", () => {
    const locale = String(btn?.dataset?.locale || "").trim();
    if (!FLAG_TO_COUNTRY[locale]) return;
    forcedLocale = locale;
    try { localStorage.setItem("skimo_locale", locale); } catch {}
    ipcRenderer.invoke("set-locale-preference", locale).catch(() => {});
    if (els.country && !state?.activated) {
      const country = FLAG_TO_COUNTRY[locale];
      if (country) els.country.value = country;
    }
    setLocale(locale);
    if (state) render(state);
  });
}

for (const btn of scrollLinks) {
  btn.addEventListener("click", () => {
    const targetId = String(btn?.dataset?.scrollTarget || "").trim();
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

ipcRenderer.on("state-update", (_evt, nextState) => render(nextState));
ipcRenderer.on("scan-log", (_evt, chunk) => appendLog(chunk));

// ============================================================
//  INIT
// ============================================================
initActivationPromoVideo();
initLocaleFromStorage();
renderOnboarding();
renderMcSearchIdle();
refreshState().catch((err) => setMessage(err?.message || String(err), true));
